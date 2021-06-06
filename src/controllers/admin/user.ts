import { Request, Response } from 'express';
import * as db from '@/models';
import Validator, { vlChecks } from '@/lib/validator';
import Grid, { GridParams } from '@/lib/classes/grid';
import * as _ from 'lodash';
 
const prisma = db.getPrisma();

export async function getFetchList (req: Request, res: Response) {
  const grid = new Grid(req.query as GridParams)
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

  const rowsQueryParts = [{
    skip: grid.skip,
    take: grid.take,
    include: {
      Avatar: true
    }
  }] as any[];
  const totalCountQuery = [{}] as any[];

  const part = {};
  rowsQueryParts.push(part);
  totalCountQuery.push(part);

  if (grid.sortBy) {
    rowsQueryParts.push({
      orderBy: {
        [grid.sortBy]: grid.sortDesc ? 'desc' : 'asc'
      }
    })
  }

  if (req.query.id) {
    const part = {
      where: {
        id: BigInt(req.query.id)
      }
    };
    rowsQueryParts.push(part);
    totalCountQuery.push(part);
  }

  if (req.query.email) {
    const part = {
      where: {
        email: {
          contains: req.query.email
        }
      }
    };
    rowsQueryParts.push(part);
    totalCountQuery.push(part);
  }

  if (req.query.role) {
    const part = {
      where: {
        role: req.query.role
      }
    };
    rowsQueryParts.push(part);
    totalCountQuery.push(part);
  }

  if (req.query.name) {
    const part = {
      where: {
        OR: {
          firstName: {
            contains: req.query.name
          },
          lastName: {
            contains: req.query.name
          }
        }
      }
    };
    rowsQueryParts.push(part);
    totalCountQuery.push(part);
  }

  const rows = await prisma.user.findMany(_.merge.apply(null, rowsQueryParts));
  const totalRows = await prisma.user.count(_.merge.apply(null, totalCountQuery));

  res.json({
    page: grid.page,
    pageSize: grid.pageSize,
    rows: rows.map((row) => db.models.User.wrap(row).publicInfo()),
    totalRows: totalRows
  });
}

export async function create (req: Request, res: Response) {
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

  const user = await prisma.user.findFirst({
    where: {
      email
    }
  });
  if (user) {
    return res
      .status(400)
      .json(Validator.singleError('email', 'userIsExists'));
  }

  const newUser = await db.models.User.createUser(
    email,
    password,
    {
      params: {
        emailActivatedAt: new Date(),
      }
    }
  );

  res.status(201).json({ user: db.models.User.wrap(newUser).publicInfo() });
}

/**
 * @method get
 * @scheme /:id
 */
export async function getById (req: Request, res: Response) {
  const userId = req.params.id;

  const user = await prisma.user.findFirst({
    where: {
      id: BigInt(userId)
    }
  });

  if (!user) {
    return res.status(404).json({
      error: 'user not found',
    });
  }

  res.json(db.models.User.wrap(user).publicInfo());
}
