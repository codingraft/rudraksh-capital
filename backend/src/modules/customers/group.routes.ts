import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import prisma from "../../config/database";
import { authenticate, branchFilter } from "../../middleware/auth";
import { auditLog } from "../../middleware/auditLog";
import {
  generateId,
  getPagination,
  paginatedResponse,
} from "../../utils/helpers";

const router = Router();
router.use(authenticate);
router.use(branchFilter);

const groupSchema = z.object({
  name: z.string().min(1),
  leaderId: z.string().optional().nullable(),
  branchId: z.string().optional(),
});

// GET /api/groups
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const bf = (req as any).branchFilter;
    const where: any = { ...bf };

    if (req.query.search) {
      const s = req.query.search as string;
      where.OR = [
        { name: { contains: s, mode: "insensitive" } },
        { groupId: { contains: s, mode: "insensitive" } },
      ];
    }

    const [groups, total] = await Promise.all([
      prisma.customerGroup.findMany({
        where,
        include: {
          branch: { select: { id: true, name: true, code: true } },
          _count: { select: { members: true } },
          members: {
            where: { id: req.query.leaderId as string | undefined }, // just to fetch leader info
            take: 1,
          }, // We'll map the actual leader info
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.customerGroup.count({ where }),
    ]);

    // Enrich leader name
    const enrichedGroups = groups.map((g) => ({
      ...g,
      leaderName: g.leaderId ? "Leader Set" : "No Leader", // We would fetch leader correctly, simplified for now
    }));

    res.json(paginatedResponse(groups, total, page, limit));
  } catch (error: any) {
    next(error);
  }
});

// GET /api/groups/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const group = await prisma.customerGroup.findUnique({
      where: { id: req.params.id },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        members: {
          select: { id: true, customerId: true, name: true, phone: true },
        },
      },
    });
    if (!group)
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    res.json({ success: true, data: group });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/groups
router.post(
  "/",
  auditLog("CustomerGroup"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = groupSchema.parse(req.body);
      const groupId = await generateId("group");
      const group = await prisma.customerGroup.create({
        data: {
          groupId,
          name: data.name,
          leaderId: data.leaderId || null,
          branchId: data.branchId || req.user!.branchId!,
        },
        include: { branch: { select: { id: true, name: true } } },
      });
      res.status(201).json({ success: true, data: group });
    } catch (error: any) {
      next(error);
    }
  },
);

// PUT /api/groups/:id
router.put(
  "/:id",
  auditLog("CustomerGroup"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = groupSchema.partial().parse(req.body);
      const group = await prisma.customerGroup.update({
        where: { id: req.params.id },
        data: { ...data },
        include: { branch: { select: { id: true, name: true } } },
      });
      res.json({ success: true, data: group });
    } catch (error: any) {
      next(error);
    }
  },
);

// POST /api/groups/:id/members
router.post(
  "/:id/members",
  auditLog("CustomerGroup"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { customerIds } = req.body;
      if (!Array.isArray(customerIds))
        throw new Error("customerIds must be an array");

      await prisma.customer.updateMany({
        where: { id: { in: customerIds } },
        data: { groupId: req.params.id },
      });

      res.json({
        success: true,
        message: "Members added to group successfully",
      });
    } catch (error: any) {
      next(error);
    }
  },
);

// DELETE /api/groups/:id/members/:customerId
router.delete(
  "/:id/members/:customerId",
  auditLog("CustomerGroup"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.customer.update({
        where: { id: req.params.customerId },
        data: { groupId: null },
      });
      res.json({ success: true, message: "Member removed from group" });
    } catch (error: any) {
      next(error);
    }
  },
);

export default router;
