import validator from 'validator';
import axios from 'axios';
import { Request } from 'express';
import config from '../config';
import * as _ from 'lodash';
import * as moment from 'moment';

interface ICheckParams {
  body?: any;
  req?: Request;
}

interface IConditionParams {
  body?: any;
}

interface ICheck {
  (value: any, params?: ICheckParams): boolean | Promise<boolean>;
}

interface IValidationCheck {
  check: ICheck;
  msg: string;
}

export interface IValidationRule {
  field: string;
  condition?(params: IConditionParams): boolean | Promise<boolean>;
  subRules?: IValidationRule[];
  each?(index: string): IValidationRule[];
  checks?: Array<IValidationCheck>;
}

interface IBody {
  [key: string]: any;
}

export class CustomChecks {
  public static notEmpty(value: any) {
    return value !== null && !validator.isEmpty(value);
  }

  public static inVals(value: any, vals: Array<any>) {
    return vals.indexOf(value) !== -1;
  }

  public static isRegEx(value: string, grep: RegExp) {
    return grep.test(value);
  }

  // offset format: '<int>:<'days'|'years'|'etc'>'
  public static isDate(
    value: string,
    dateFormat: string,
    params?: {
      offsetForMin?: {
        num: number;
        unit: moment.unitOfTime.DurationConstructor;
      };
      offsetForMax?: {
        num: number;
        unit: moment.unitOfTime.DurationConstructor;
      };
    }
  ) {
    if (value.length !== dateFormat.length) {
      return false;
    }
    const momentDate = moment(value, dateFormat);
    let isValid = momentDate.isValid();
    if (!isValid) {
      return false;
    }
    if (params) {
      if (params.offsetForMin) {
        let minDate = moment()
          .add(params.offsetForMin.num, params.offsetForMin.unit)
          .toDate();
        if (momentDate.toDate() < minDate) {
          return false;
        }
      }
      if (params.offsetForMax) {
        let maxDate = moment()
          .add(params.offsetForMax.num, params.offsetForMax.unit)
          .toDate();
        if (momentDate.toDate() > maxDate) {
          return false;
        }
      }
    }
    return true;
  }

  public static isAdultManBirtchDateFormat(value: string, dateFormat: string) {
    return this.isDate(value, dateFormat, {
      offsetForMin: { num: -100, unit: 'years' },
      offsetForMax: { num: -18, unit: 'years' },
    });
  }

  public static isBool(value: any) {
    return typeof value === 'boolean' || value === 'true' || value === 'false';
  }

  public static isOldTsYearIssued (value: any) {
    return vlChecks.isInt(value, { min: 1970, max: new Date().getFullYear() - 5 });
  }

  public static async googleRecaptchaVerify(value, req: Request) {
    var recaptcha_url = 'https://www.google.com/recaptcha/api/siteverify?';
    recaptcha_url += 'secret=' + config.googleRecaptcha.secretKey + '&';
    recaptcha_url += 'response=' + value + '&';
    recaptcha_url += 'remoteip=' + req.connection.remoteAddress;

    try {
      const res = await axios.get(recaptcha_url);
      return res.data.success;
    } catch (error) {
      return false;
    }
  }
}

export const vlChecks = Object.assign(CustomChecks, validator);

export class ValidationResult {
  public fields: { [field: string]: { errors: Array<string> } } = {};

  public getTotalErrors() {
    let errorsTotal = 0;
    for (let field of Object.values(this.fields)) {
      errorsTotal += field.errors.length;
    }
    return errorsTotal;
  }
}

export default class Validator {
  private rules: IValidationRule[];
  private req: Request;
  private body: IBody;
  private validationResult: ValidationResult = new ValidationResult();

  constructor(rules: IValidationRule[]) {
    this.rules = rules;
  }

  public setRequest(req: Request) {
    this.req = req;

    if (!this.body) {
      if (this.req.method === 'GET') {
        this.body = this.req.query;
      } else {
        this.body = this.req.body;
      }
    }

    return this;
  }

  public setBody(body: IBody) {
    this.body = body;
    return this;
  }

  private async parseRules(
    validationResult: ValidationResult,
    rules: IValidationRule[],
    fildsFilter?: Array<string>
  ) {
    if (!this.validationResult) {
      return;
    }

    let req = this.req;
    let body = this.body;

    for (let rule of rules) {
      let field = rule.field || '';
      let allowFlag = false;
      if (!fildsFilter) {
        allowFlag = true;
      } else {
        for (let filt of fildsFilter) {
          if (filt.endsWith('*') && field.startsWith(filt.replace('*', ''))) {
            allowFlag = true;
            break;
          } else if (filt === field) {
            allowFlag = true;
            break;
          }
        }
      }
      if (!allowFlag) {
        continue;
      }

      Validator.initOrClearErrorField(validationResult, field);
      if (typeof rule.condition === 'function' && !rule.condition({ body })) {
        continue;
      }

      let value = _.get(body, field);

      if (rule.subRules) {
        if (Array.isArray(rule.subRules)) {
          let subRules = rule.subRules;
          await this.parseRules(validationResult, subRules, fildsFilter);
        } else {
          Validator.addErrorToField(
            validationResult,
            field,
            'badValidatorFormatField'
          );
          continue;
        }
      } else if (typeof rule.each === 'function') {
        if (Array.isArray(value)) {
          for (let index in value) {
            let subRules = rule.each(index);
            await this.parseRules(validationResult, subRules, fildsFilter);
          }
        } else {
          Validator.addErrorToField(
            validationResult,
            field,
            'badValidatorFormatField'
          );
          continue;
        }
      } else if (rule.checks && Array.isArray(rule.checks)) {
        for (let check of rule.checks) {
          const checkResult = await check.check(value, { body, req });
          if (!checkResult) {
            Validator.addErrorToField(
              validationResult,
              field,
              check.msg || 'invalid'
            );
          }
        }
      } else {
        Validator.addErrorToField(
          validationResult,
          field,
          'badValidatorFormatField'
        );
      }
    }
  }

  public async validation(fildsFilter?: Array<string>) {
    let validationResult = new ValidationResult();

    await this.parseRules(validationResult, this.rules, fildsFilter);

    for (let validationField of Object.keys(validationResult.fields)) {
      this.validationResult.fields[validationField] =
        validationResult.fields[validationField];
    }

    return validationResult;
  }

  private static initOrClearErrorField(
    validationResult: ValidationResult,
    field: string
  ) {
    validationResult.fields[field] = {
      errors: [],
    };
  }

  private static addErrorToField(
    validationResult: ValidationResult,
    field,
    errorMsg
  ) {
    validationResult.fields[field].errors.push(errorMsg);
  }

  public static singleError(field: string, errorMsg: string) {
    let validationResult = new ValidationResult();
    Validator.initOrClearErrorField(validationResult, field);
    Validator.addErrorToField(validationResult, field, errorMsg || 'invalid');
    return validationResult;
  }
}
