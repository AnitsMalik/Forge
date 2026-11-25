/**
 * Brand Knowledge Graph & Advanced Vector Memory Controller
 * SocialForge Platform v4.9.0
 */

import { Request, Response, NextFunction } from 'express';
import { knowledgeGraphService, KnowledgeGraphError } from '../services/superadmin/knowledgeGraph.service.js';

function actorOf(req: Request) {
  return {
    id: req.user?.userId || 'unknown-operator',
    email: req.user?.email || 'superadmin@socialforge.ai',
  };
}

function handle(res: Response, next: NextFunction, err: any, fallbackStatus = 400) {
  if (err instanceof KnowledgeGraphError) {
    return res.status(err.status).json({ success: false, error: err.message });
  }
  if (fallbackStatus >= 500) return next(err);
  return res.status(fallbackStatus).json({ success: false, error: err?.message || 'Request failed' });
}

export class KnowledgeGraphController {
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const brandId = req.query.brandId as string | undefined;
      const data = await knowledgeGraphService.getOverview(brandId);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  // Nodes
  async listNodes(req: Request, res: Response, next: NextFunction) {
    try {
      const { brandId, tenantId, entityType, search } = req.query;
      const data = await knowledgeGraphService.listNodes({
        brandId: brandId as string | undefined,
        tenantId: tenantId as string | undefined,
        entityType: entityType as string | undefined,
        search: search as string | undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async getNodeById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await knowledgeGraphService.getNodeById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async createNode(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await knowledgeGraphService.createNode(req.body, actorOf(req));
      res.status(201).json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async updateNode(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await knowledgeGraphService.updateNode(req.params.id, req.body, actorOf(req));
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async deleteNode(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await knowledgeGraphService.deleteNode(req.params.id, actorOf(req));
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  // Edges
  async listEdges(req: Request, res: Response, next: NextFunction) {
    try {
      const { brandId, tenantId, sourceNodeId, targetNodeId, relationType } = req.query;
      const data = await knowledgeGraphService.listEdges({
        brandId: brandId as string | undefined,
        tenantId: tenantId as string | undefined,
        sourceNodeId: sourceNodeId as string | undefined,
        targetNodeId: targetNodeId as string | undefined,
        relationType: relationType as string | undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async getEdgeById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await knowledgeGraphService.getEdgeById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async createEdge(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await knowledgeGraphService.createEdge(req.body, actorOf(req));
      res.status(201).json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async deleteEdge(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await knowledgeGraphService.deleteEdge(req.params.id, actorOf(req));
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  // Memories
  async listMemories(req: Request, res: Response, next: NextFunction) {
    try {
      const { brandId, tenantId, memoryType, search } = req.query;
      const data = await knowledgeGraphService.listMemories({
        brandId: brandId as string | undefined,
        tenantId: tenantId as string | undefined,
        memoryType: memoryType as string | undefined,
        search: search as string | undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async createMemory(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await knowledgeGraphService.createMemory(req.body, actorOf(req));
      res.status(201).json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async deleteMemory(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await knowledgeGraphService.deleteMemory(req.params.id, actorOf(req));
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  // Vector Search
  async semanticSearch(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await knowledgeGraphService.semanticSearch(req.body);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  // Multi-Hop Traversal
  async traverseGraph(req: Request, res: Response, next: NextFunction) {
    try {
      const { rootNodeId, maxDepth } = req.body;
      if (!rootNodeId) return res.status(400).json({ success: false, error: 'rootNodeId is required' });
      const data = await knowledgeGraphService.traverseGraph(rootNodeId, maxDepth ? Number(maxDepth) : 2);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }
}

export const knowledgeGraphController = new KnowledgeGraphController();
