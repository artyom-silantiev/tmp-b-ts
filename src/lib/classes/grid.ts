export interface GridParams {
  page?: string;
  pageSize?: string;
  sortBy?: string;
  sortDesc?: string;
}

export default class Grid {
  public page: number;
  public pageSize: number;
  public skip: number;
  public take: number;
  public sortBy: string | null;
  public sortDesc: boolean;

  private gridParams: GridParams;
  private sortParams;

  constructor(gridParams: GridParams) {
    this.gridParams = gridParams;
  }

  public setSortOptions(sortParams: Array<string>): Grid {
    this.sortParams = sortParams;
    return this;
  }

  public init() {
    const params = this.gridParams;

    // page num
    this.page = typeof params.page === 'string' ? parseInt(params.page) : 1;
    if (!Number.isInteger(this.page) || this.page <= 0) {
      this.page = 1;
    }

    // page size
    this.pageSize =
      typeof params.pageSize === 'string' ? parseInt(params.pageSize) : 20;
    if (!Number.isInteger(this.pageSize) || this.pageSize <= 0) {
      this.pageSize = 20;
    }
    this.skip = this.pageSize * (this.page - 1);
    this.take = this.pageSize;

    // sortBy
    if (typeof params.sortBy === 'string') {
      this.sortBy = params.sortBy;
      if (this.sortBy && this.sortParams.indexOf(this.sortBy) === -1) {
        this.sortBy = null;
      }
    }

    // sortDesc
    if (typeof params.sortDesc === 'string') {
      this.sortDesc =
        ['1', 'true'].indexOf(params.sortDesc) !== -1 ? true : false;
    }

    return this;
  }
}
