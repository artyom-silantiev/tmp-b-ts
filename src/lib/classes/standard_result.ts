export default class StandardResult <T> {

  public code: number;
  public message: string;
  public data: null | T = null;

  constructor (code = 200) {
    this.code = code;
  }

  public setMessage (message: string) {
    this.message = message;
    return this;
  }

  public setCode (code: number) {
    this.code = code;
    return this;
  }

  public setData (data: T) {
    this.data = data;
    return this;
  }

  public isGood () {
    return this.code >= 200 && this.code <= 299;
  }

  public isBad () {
    return this.code >= 400;
  }

}
