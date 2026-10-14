import db from '../../../shared/config/database';
import { ForwardJob, ForwardJobAttributes } from '../models/ForwardJob';

export const createJob = (
  data: Pick<ForwardJobAttributes, 'userId' | 'sourceRef' | 'scope' | 'deliverChatId'> &
    Partial<ForwardJobAttributes>,
) => ForwardJob.create(data);

export const findById = (id: string, userId?: string) =>
  ForwardJob.findOne({ where: userId ? { id, userId } : { id } });

export const listByUser = (userId: string, limit = 20) =>
  ForwardJob.findAll({ where: { userId }, order: [['createdAt', 'DESC']], limit });

export const update = (job: ForwardJob, data: Partial<ForwardJobAttributes>) => job.update(data);

/** Atomically claim the next queued job for a worker. */
export const claimNextQueued = (): Promise<ForwardJob | null> =>
  db.transaction(async (t) => {
    const job = await ForwardJob.findOne({
      where: { status: 'queued' },
      order: [['createdAt', 'ASC']],
      lock: t.LOCK.UPDATE,
      skipLocked: true,
      transaction: t,
    });
    if (!job) return null;
    await job.update({ status: 'running', startedAt: new Date() }, { transaction: t });
    return job;
  });

/** Reset jobs stuck in "running" (e.g. after a crash) back to queued. */
export const requeueStale = () =>
  ForwardJob.update(
    { status: 'queued' },
    { where: { status: 'running' } },
  );
