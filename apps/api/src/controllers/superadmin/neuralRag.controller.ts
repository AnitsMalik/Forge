/**
 * Enterprise Distributed Semantic Search, Neural Vector Embedding Ingestion & Hybrid RAG Knowledge Mesh Controller
 * SocialForge Platform v6.4.0
 */

import type { Request, Response } from 'express';
import { neuralRagService } from '../../services/superadmin/neuralRag.service.js';

export class NeuralRagController {
  async getTelemetry(req: Request, res: Response): Promise<void> {
    try {
      const telemetry = await neuralRagService.getTelemetry();
      res.json({ success: true, data: telemetry });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listModels(req: Request, res: Response): Promise<void> {
    try {
      const models = await neuralRagService.getModels();
      res.json({ success: true, data: models });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createModel(req: Request, res: Response): Promise<void> {
    try {
      const { model_name, provider_type, model_family, dimension_size, max_input_tokens, cost_per_million_tokens, is_active, is_default } = req.body;
      if (!model_name || !provider_type || !model_family || !dimension_size) {
        res.status(400).json({ success: false, error: 'model_name, provider_type, model_family, and dimension_size are required' });
        return;
      }

      const model = await neuralRagService.createModel({
        model_name,
        provider_type,
        model_family,
        dimension_size: Number(dimension_size),
        max_input_tokens: max_input_tokens !== undefined ? Number(max_input_tokens) : undefined,
        cost_per_million_tokens: cost_per_million_tokens !== undefined ? Number(cost_per_million_tokens) : undefined,
        is_active,
        is_default,
      });

      res.status(201).json({ success: true, data: model });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listCollections(req: Request, res: Response): Promise<void> {
    try {
      const collections = await neuralRagService.getCollections();
      res.json({ success: true, data: collections });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createCollection(req: Request, res: Response): Promise<void> {
    try {
      const { collection_name, target_tenant_id, model_id, distance_metric, index_type, is_immutable } = req.body;
      if (!collection_name || !model_id) {
        res.status(400).json({ success: false, error: 'collection_name and model_id are required' });
        return;
      }

      const collection = await neuralRagService.createCollection({
        collection_name,
        target_tenant_id,
        model_id,
        distance_metric,
        index_type,
        is_immutable,
      });

      res.status(201).json({ success: true, data: collection });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async ingestEmbedding(req: Request, res: Response): Promise<void> {
    try {
      const { collection_id, document_id, chunk_index, content_text, metadata, custom_vector } = req.body;
      if (!collection_id || !document_id || !content_text) {
        res.status(400).json({ success: false, error: 'collection_id, document_id, and content_text are required' });
        return;
      }

      const result = await neuralRagService.ingestVectorEmbedding({
        collection_id,
        document_id,
        chunk_index: chunk_index !== undefined ? Number(chunk_index) : undefined,
        content_text,
        metadata,
        custom_vector,
      });

      res.status(201).json({ success: true, data: result.embedding, isDuplicate: result.isDuplicate });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async hybridSearch(req: Request, res: Response): Promise<void> {
    try {
      const { collection_id, query_text, top_k, dense_weight, sparse_weight, rrf_k } = req.body;
      if (!collection_id || !query_text) {
        res.status(400).json({ success: false, error: 'collection_id and query_text are required' });
        return;
      }

      const operatorEmail = (req as any).user?.email || 'security.lead@socialforge.io';
      const result = await neuralRagService.hybridSearch(
        {
          collection_id,
          query_text,
          top_k: top_k ? Number(top_k) : undefined,
          dense_weight: dense_weight !== undefined ? Number(dense_weight) : undefined,
          sparse_weight: sparse_weight !== undefined ? Number(sparse_weight) : undefined,
          rrf_k: rrf_k ? Number(rrf_k) : undefined,
        },
        operatorEmail
      );

      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listQueryLogs(req: Request, res: Response): Promise<void> {
    try {
      const { collection_id } = req.query;
      const logs = await neuralRagService.getQueryLogs(collection_id as string | undefined);
      res.json({ success: true, data: logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const neuralRagController = new NeuralRagController();
