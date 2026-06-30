import "server-only";
import { prisma } from "@/lib/prisma";

export type JobStatusFilter = "OPEN" | "ASSIGNED" | "CLOSED" | "ALL";

export interface JobSummary {
  id: string;
  title: string;
  description: string;
  targetDistrict: string;
  budgetAmount: number; // poisha
  status: "OPEN" | "ASSIGNED" | "CLOSED";
  postedById: string;
  postedByEmail: string;
  applicationCount: number;
  myApplication: {
    id: string;
    bidAmount: number;
    estimatedDeliveryDays: number;
    note: string | null;
    status: "PENDING" | "ACCEPTED" | "REJECTED";
  } | null;
  createdAt: Date;
}

export interface MyJobPost {
  id: string;
  title: string;
  description: string;
  targetDistrict: string;
  budgetAmount: number;
  status: "OPEN" | "ASSIGNED" | "CLOSED";
  createdAt: Date;
  applications: {
    id: string;
    agentEmail: string;
    bidAmount: number;
    estimatedDeliveryDays: number;
    note: string | null;
    status: "PENDING" | "ACCEPTED" | "REJECTED";
    createdAt: Date;
  }[];
}

export async function getJobBoard(
  viewerId: string,
  district?: string,
): Promise<JobSummary[]> {
  const jobs = await prisma.jobPost.findMany({
    where: {
      status: "OPEN",
      ...(district ? { targetDistrict: district } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      postedBy: { select: { email: true } },
      applications: {
        select: {
          id: true,
          agentId: true,
          bidAmount: true,
          estimatedDeliveryDays: true,
          note: true,
          status: true,
        },
      },
    },
  });

  return jobs.map((job) => {
    const mine = job.applications.find((a) => a.agentId === viewerId) ?? null;
    return {
      id: job.id,
      title: job.title,
      description: job.description,
      targetDistrict: job.targetDistrict,
      budgetAmount: job.budgetAmount,
      status: job.status as "OPEN" | "ASSIGNED" | "CLOSED",
      postedById: job.postedById,
      postedByEmail: job.postedBy.email,
      applicationCount: job.applications.length,
      myApplication: mine
        ? {
            id: mine.id,
            bidAmount: mine.bidAmount,
            estimatedDeliveryDays: mine.estimatedDeliveryDays,
            note: mine.note,
            status: mine.status as "PENDING" | "ACCEPTED" | "REJECTED",
          }
        : null,
      createdAt: job.createdAt,
    };
  });
}

export async function getMyPostedJobs(userId: string): Promise<MyJobPost[]> {
  const jobs = await prisma.jobPost.findMany({
    where: { postedById: userId },
    orderBy: { createdAt: "desc" },
    include: {
      applications: {
        orderBy: { createdAt: "desc" },
        include: {
          agent: { select: { email: true } },
        },
      },
    },
  });

  return jobs.map((job) => ({
    id: job.id,
    title: job.title,
    description: job.description,
    targetDistrict: job.targetDistrict,
    budgetAmount: job.budgetAmount,
    status: job.status as "OPEN" | "ASSIGNED" | "CLOSED",
    createdAt: job.createdAt,
    applications: job.applications.map((a) => ({
      id: a.id,
      agentEmail: a.agent.email,
      bidAmount: a.bidAmount,
      estimatedDeliveryDays: a.estimatedDeliveryDays,
      note: a.note,
      status: a.status as "PENDING" | "ACCEPTED" | "REJECTED",
      createdAt: a.createdAt,
    })),
  }));
}

export async function getAgentApplications(agentId: string) {
  const apps = await prisma.jobApplication.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
    include: {
      jobPost: {
        select: {
          id: true,
          title: true,
          targetDistrict: true,
          budgetAmount: true,
          status: true,
        },
      },
    },
  });

  return apps.map((a) => ({
    id: a.id,
    bidAmount: a.bidAmount,
    estimatedDeliveryDays: a.estimatedDeliveryDays,
    note: a.note,
    status: a.status as "PENDING" | "ACCEPTED" | "REJECTED",
    createdAt: a.createdAt,
    job: {
      id: a.jobPost.id,
      title: a.jobPost.title,
      targetDistrict: a.jobPost.targetDistrict,
      budgetAmount: a.jobPost.budgetAmount,
      status: a.jobPost.status as "OPEN" | "ASSIGNED" | "CLOSED",
    },
  }));
}
