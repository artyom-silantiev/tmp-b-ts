import { Router, Request, Response, NextFunction } from 'express';
import * as db from '../../../db';
import Validator, { vlChecks } from '../../../lib/validator';
import Grid from '../../../lib/grid';

const router = Router();

router.get('/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const grid = new Grid(req.query)
      .setSortOptions([
        'id',
        'role',
        'email',
        'emailActivatedAt',
        'firstName',
        'lastName',
        'createdAt',
      ])
      .init();

    let rowsQuery = db.models.User.getRepository()
      .createQueryBuilder('row')
      .select()
      .skip(grid.skip)
      .take(grid.take);
    let totalCountQuery = db.models.User.getRepository()
      .createQueryBuilder('row')
      .select();

    if (grid.sortBy) {
      rowsQuery.orderBy('row.' + grid.sortBy, grid.sortDesc ? 'DESC' : 'ASC');
    }

    if (req.query.id) {
      rowsQuery = rowsQuery.andWhere('row.id = :id', { id: req.query.id });
      totalCountQuery = totalCountQuery.andWhere('row.id = :id', {
        id: req.query.id,
      });
    }

    if (req.query.email) {
      rowsQuery = rowsQuery.andWhere('row.email ILIKE :email', {
        email: `%${req.query.email}%`,
      });
      totalCountQuery = totalCountQuery.andWhere('row.email ILIKE :email', {
        email: `%${req.query.email}%`,
      });
    }

    if (req.query.role) {
      rowsQuery = rowsQuery.andWhere('row.role = :role', {
        role: req.query.role,
      });
      totalCountQuery = totalCountQuery.andWhere('row.role = :role', {
        role: req.query.role,
      });
    }

    if (req.query.name) {
      rowsQuery = rowsQuery.andWhere(
        `CONCAT(row.firstName, ' ', row.lastName) ILIKE :fullName`,
        { fullName: `%${req.query.name}%` }
      );
      totalCountQuery = totalCountQuery.andWhere(
        `CONCAT(row.firstName, ' ', row.lastName) ILIKE :fullName`,
        { fullName: `%${req.query.name}%` }
      );
    }

    const rows = await rowsQuery.getMany();
    const totalRows = await totalCountQuery.getCount();

    res.json({
      page: grid.page,
      pageSize: grid.pageSize,
      rows: rows.map((row) => row.publicInfo()),
      totalRows: totalRows,
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/create',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let userRegIsDisabledSetting = await db.models.Setting.getRepository().getSetting(
        db.models.Setting.Settings.userRegistrationDisabled
      );
      if (userRegIsDisabledSetting && userRegIsDisabledSetting.value === '1') {
        return res.status(403).send('disabled');
      }

      let validationResult = await new Validator([
        {
          field: 'email',
          checks: [
            { check: (val) => vlChecks.notEmpty(val), msg: 'fieldRequired' },
            { check: (val) => vlChecks.isEmail(val), msg: 'fieldInvalid' },
          ],
        },
        {
          field: 'password',
          checks: [
            { check: (val) => vlChecks.notEmpty(val), msg: 'fieldRequired' },
          ],
        },
        {
          field: 'passwordConfirmation',
          checks: [
            { check: (val) => vlChecks.notEmpty(val), msg: 'fieldRequired' },
            {
              check: (value, { body }) => value === body['password'],
              msg: 'fieldInvalid',
            },
          ],
        },
      ])
        .setRequest(req)
        .validation();
      if (validationResult.getTotalErrors() > 0) {
        return res.status(400).json(validationResult);
      }

      const email = req.body.email;
      const password = req.body.password;

      const user = await db.models.User.getRepository().findOne({
        where: {
          email,
        },
      });
      if (user) {
        return res
          .status(400)
          .json(Validator.singleError('email', 'userIsExists'));
      }

      const newUser = await db.models.User.getRepository().createUser(
        email,
        password,
        {
          params: {
            emailActivatedAt: new Date(),
          }
        }
      );

      res.status(201).json({ user: newUser.publicInfo() });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/byid/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id;

      const user = await db.models.User.getRepository().findOne({
        where: {
          id: userId,
        },
      });

      if (!user) {
        return res.status(404).json({
          error: 'user not found',
        });
      }

      res.json(user.publicInfo());
    } catch (error) {
      next(error);
    }
  }
);

export default router;
