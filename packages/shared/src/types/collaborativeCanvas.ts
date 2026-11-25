/**
 * Multi-Tenant Real-Time Collaborative Canvas, Operational Transformation (OT/CRDT) & Presence Gateway Types
 * SocialForge Platform v6.5.0
 */

export type CanvasRoomStatus = 'active' | 'idle' | 'archived';
export type CanvasOpType = 'insert_layer' | 'update_transform' | 'delete_layer' | 'reorder_z_index' | 'style_change';
export type PresenceStatus = 'connected' | 'reconnecting' | 'disconnected';
export type CanvasElementType = 'text' | 'image' | 'shape' | 'video' | 'group';

export interface CanvasLayerElement {
  id: string;
  type: CanvasElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  props: Record<string, any>;
}

export interface CanvasRoom {
  id: string;
  room_name: string;
  target_brand_id: string;
  template_id: string | null;
  current_revision: number;
  active_peers_count: number;
  is_locked: boolean;
  status: CanvasRoomStatus;
  created_at: string;
}

export interface CanvasDocumentSnapshot {
  id: string;
  room_id: string;
  revision: number;
  elements: CanvasLayerElement[];
  total_elements_count: number;
  checksum_sha256: string;
  compacted_at: string;
}

export interface OperationalTransformationOp {
  id: string;
  room_id: string;
  client_id: string;
  op_type: CanvasOpType;
  target_layer_id: string;
  base_revision: number;
  applied_revision: number;
  payload: Record<string, any>;
  created_at: string;
}

export interface ActiveUserPresenceSession {
  id: string;
  room_id: string;
  user_id: string;
  user_email: string;
  display_name: string;
  cursor_position_x: number;
  cursor_position_y: number;
  current_selected_layer_id: string | null;
  last_heartbeat_at: string;
  connection_status: PresenceStatus;
}

export interface CollaborativeCanvasTelemetry {
  total_active_rooms: number;
  total_concurrent_peers: number;
  total_ops_processed_24h: number;
  avg_op_propagation_latency_ms: number;
  crdt_conflict_resolution_rate: number;
}

export interface CreateCanvasRoomInput {
  room_name: string;
  target_brand_id: string;
  template_id?: string;
  initial_elements?: CanvasLayerElement[];
}

export interface ApplyCanvasOpInput {
  room_id: string;
  client_id: string;
  op_type: CanvasOpType;
  target_layer_id: string;
  base_revision: number;
  payload: Record<string, any>;
}

export interface ApplyCanvasOpResult {
  applied_op: OperationalTransformationOp;
  new_revision: number;
  transformed: boolean;
  current_elements: CanvasLayerElement[];
}

export interface UpdatePresenceInput {
  room_id: string;
  cursor_position_x: number;
  cursor_position_y: number;
  current_selected_layer_id?: string | null;
}

export interface UpdatePresenceResult {
  session: ActiveUserPresenceSession;
  peers: ActiveUserPresenceSession[];
}

export interface GetRoomStateResult {
  room: CanvasRoom;
  elements: CanvasLayerElement[];
  presence: ActiveUserPresenceSession[];
  recent_ops: OperationalTransformationOp[];
}
