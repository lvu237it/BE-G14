import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import {
  CreateWorkItemDto,
  WorkItemListItemDto,
} from 'src/common/interfaces/dto/work-item.dto';
import { User } from 'src/entities/user.entity';
import { WorkItem } from 'src/entities/work-item.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class WorkItemService {
  constructor(
    @InjectRepository(WorkItem)
    private readonly workItemRepo: Repository<WorkItem>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findByUser(
    userId: string,
    status?: 'pending' | 'completed',
    page = 1,
    limit = 10,
    search?: string,
    from?: Date,
    to?: Date,
    sortOptions: {
      field: 'start_date' | 'task_name' | 'ballot_name';
      order: 'ASC' | 'DESC';
    }[] = [{ field: 'start_date', order: 'DESC' }],
  ) {
    const qb = this.workItemRepo
      .createQueryBuilder('work_item')
      .where('work_item.user_id = :userId', { userId });

    // Filter status
    if (status) {
      qb.andWhere('work_item.status = :status', { status });
    }

    // Filter search
    if (search) {
      qb.andWhere(
        '(LOWER(work_item.ballot_name) LIKE :search OR LOWER(work_item.task_name) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    // Filter date range
    if (from) {
      qb.andWhere('work_item.start_date >= :from', { from });
    }
    if (to) {
      qb.andWhere('work_item.start_date <= :to', { to });
    }

    // SORT nhiều field
    sortOptions.forEach((sort, index) => {
      const columnAlias =
        sort.field === 'start_date'
          ? 'work_item.start_date'
          : sort.field === 'task_name'
            ? 'work_item.task_name'
            : 'work_item.ballot_name';

      if (index === 0) qb.orderBy(columnAlias, sort.order);
      else qb.addOrderBy(columnAlias, sort.order);
    });

    // Fallback sort
    qb.addOrderBy('work_item.createdAt', 'DESC');

    // Pagination
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    // Load assigners
    const assignerIds = items
      .map((item) => (item as any).createdBy)
      .filter(Boolean);

    const assignersById: Record<string, any> = {};
    if (assignerIds.length > 0) {
      const assigners = await this.userRepo.find({
        where: { id: In(assignerIds) },
      });
      assigners.forEach((a) => {
        assignersById[a.id] = a;
      });
    }

    return {
      items: items.map((item) => this.toListItemDto(item, assignersById)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId?: string): Promise<WorkItemListItemDto> {
    const qb = this.workItemRepo
      .createQueryBuilder('work_item')
      .where('work_item.id = :id', { id });

    if (userId) {
      qb.andWhere('work_item.user_id = :userId', { userId });
    }

    const item = await qb.getOne();

    if (!item) {
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: 'Không tìm thấy công việc',
      });
    }

    // Load thông tin người giao việc
    const assignersById: Record<string, any> = {};
    if ((item as any).createdBy) {
      const assignerUser = await this.userRepo.findOne({
        where: { id: (item as any).createdBy },
      });
      if (assignerUser) {
        assignersById[assignerUser.id] = assignerUser;
      }
    }

    return this.toListItemDto(item, assignersById);
  }

  async findRef(
    ref_id: string,
    ref_type: string,
    status: string,
  ): Promise<WorkItemListItemDto> {
    const qb = this.workItemRepo
      .createQueryBuilder('work_item')
      .where('work_item.ref_id = :ref_id', { ref_id })
      .andWhere('work_item.ref_type = :ref_type', { ref_type })
      .andWhere('work_item.status = :status', { status })
      .limit(1);

    const item = await qb.getOne();

    if (!item) {
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: 'Không tìm thấy công việc',
      });
    }

    // Load thông tin người giao việc
    const assignersById: Record<string, any> = {};
    if ((item as any).createdBy) {
      const assignerUser = await this.userRepo.findOne({
        where: { id: (item as any).createdBy },
      });
      if (assignerUser) {
        assignersById[assignerUser.id] = assignerUser;
      }
    }

    return this.toListItemDto(item, assignersById);
  }

  async create(
    dto: CreateWorkItemDto,
    createdBy: string,
  ): Promise<WorkItemListItemDto> {
    const user = await this.userRepo.findOne({ where: { id: dto.user_id } });
    if (!user) {
      throw new NotFoundException({
        errCode: ERROR_CODES.USER_NOT_FOUND,
        message: 'Không tìm thấy user',
      });
    }

    const workItem = this.workItemRepo.create({
      ...dto,
      createdBy,
      start_date: dto.start_date ?? new Date(),
    });

    const saved = await this.workItemRepo.save(workItem);

    const assignersById: Record<string, any> = {};
    if (createdBy) {
      const assignerUser = await this.userRepo.findOne({
        where: { id: createdBy },
      });
      if (assignerUser) {
        assignersById[assignerUser.id] = assignerUser;
      }
    }

    return this.toListItemDto(saved, assignersById);
  }

  async completeByRef(
    userId: string,
    refType: string,
    refId: string,
    taskType?: string,
  ): Promise<void> {
    const qb = this.workItemRepo
      .createQueryBuilder('work_item')
      .where('work_item.user_id = :userId', { userId })
      .andWhere('work_item.ref_type = :refType', { refType })
      .andWhere('work_item.ref_id = :refId', { refId })
      .andWhere('work_item.status = :status', { status: 'pending' });

    if (taskType) qb.andWhere('work_item.task_type = :taskType', { taskType });

    const item = await qb.getOne();
    if (!item) return; // Không có task pending phù hợp thì bỏ qua

    item.status = 'completed';
    item.completed_at = new Date();
    await this.workItemRepo.save(item);
  }

  async deleteWorkItemForRef(
    refType: string,
    refId: string,
    taskType?: string,
  ): Promise<void> {
    const qb = this.workItemRepo
      .createQueryBuilder('work_item')
      .where('work_item.ref_type = :refType', { refType })
      .andWhere('work_item.ref_id = :refId', { refId });

    if (taskType) {
      qb.andWhere('work_item.task_type = :taskType', { taskType });
    }

    await qb.delete().execute();
  }

  async findExisting(
    checks: {
      user_id: string;
      ref_type: string;
      ref_id: string | undefined | null;
    }[],
  ): Promise<Record<string, boolean>> {
    const ids = checks.map((c) => c.ref_id).filter(Boolean);
    if (ids.length === 0) return {};
    const items = await this.workItemRepo.find({
      where: checks
        .filter((c) => !!c.ref_id)
        .map((q) => ({
          user_id: q.user_id,
          ref_type: q.ref_type,
          ref_id: q.ref_id!,
          status: 'pending',
        })),
    });
    const result: Record<string, boolean> = {};
    for (const q of checks) {
      result[q.ref_type] = !!items.find(
        (i) =>
          i.user_id === q.user_id &&
          i.ref_type === q.ref_type &&
          i.ref_id === q.ref_id,
      );
    }
    return result;
  }

  async findAllUsersByRef(refType: string, refId: string): Promise<string[]> {
    const items = await this.workItemRepo.find({
      where: { ref_type: refType, ref_id: refId },
      select: ['user_id'],
    });
    return items.map((i) => i.user_id);
  }

  private toListItemDto(
    item: WorkItem,
    assignersById: Record<string, any> = {},
  ): WorkItemListItemDto {
    const createdById = (item as any).createdBy;
    const assignerUser = createdById ? assignersById[createdById] : null;
    const assigner = assignerUser
      ? {
          id: assignerUser.id,
          code: assignerUser.code,
          firstname: assignerUser.firstname,
          lastname: assignerUser.lastname,
        }
      : null;

    return {
      id: (item as any).id,
      ballot_name: item.ballot_name,
      task_name: item.task_name,
      start_date: item.start_date ?? null,
      status: item.status,
      ref_type: item.ref_type,
      ref_id: item.ref_id,
      task_type: item.task_type,
      assigner,
      createdAt: (item as any).createdAt ?? null,
      updatedAt: (item as any).updatedAt ?? null,
    };
  }
}
