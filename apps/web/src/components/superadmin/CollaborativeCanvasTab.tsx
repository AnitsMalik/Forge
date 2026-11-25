/**
 * Multi-Tenant Real-Time Collaborative Canvas, Operational Transformation (OT/CRDT) & Presence Gateway Tab
 * HoaspForge Platform v6.5.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Palette,
  Users,
  Layers,
  Activity,
  RefreshCw,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Move,
  MousePointer,
  Shuffle,
  Eye,
  Sliders,
  Type,
  Image as ImageIcon,
  Square,
  Sparkles,
  Zap,
  Clock,
  History,
  X,
} from 'lucide-react';
import { api } from '../../services/api.js';
import type {
  CanvasRoom,
  CanvasLayerElement,
  OperationalTransformationOp,
  ActiveUserPresenceSession,
  CollaborativeCanvasTelemetry,
  CanvasOpType,
} from '@socialforge/shared';

interface Props {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type SubTab = 'rooms' | 'presence' | 'ops_stream' | 'sandbox';

export const CollaborativeCanvasTab: React.FC<Props> = ({ showToast }) => {
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('sandbox');

  // Telemetry
  const [telemetry, setTelemetry] = useState<CollaborativeCanvasTelemetry | null>(null);

  // Rooms
  const [rooms, setRooms] = useState<CanvasRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<CanvasRoom | null>(null);

  // Elements & State for Selected Room
  const [elements, setElements] = useState<CanvasLayerElement[]>([]);
  const [presencePeers, setPresencePeers] = useState<ActiveUserPresenceSession[]>([]);
  const [recentOps, setRecentOps] = useState<OperationalTransformationOp[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  // Modal State for New Room
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('Brand Campaign Dynamic Reel Canvas');
  const [newRoomBrandId, setNewRoomBrandId] = useState('brand-flagship-001');
  const [newRoomTemplateId, setNewRoomTemplateId] = useState('template-reel-flagship-01');

  // Sandbox Op Dispatch State
  const [simulatingOp, setSimulatingOp] = useState(false);
  const [simulatingCollision, setSimulatingCollision] = useState(false);
  const [simulatingHeartbeat, setSimulatingHeartbeat] = useState(false);

  // Load telemetry and rooms
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [telRes, roomsRes] = await Promise.all([
        api.adminOps.getCollaborativeCanvasTelemetry(),
        api.adminOps.listCanvasRooms(),
      ]);

      setTelemetry(telRes);
      setRooms(roomsRes);

      const activeRoomId = selectedRoomId || (roomsRes.length > 0 ? roomsRes[0].id : '');
      if (activeRoomId) {
        setSelectedRoomId(activeRoomId);
        const roomState = await api.adminOps.getCanvasRoomState(activeRoomId);
        setSelectedRoom(roomState.room);
        setElements(roomState.elements);
        setPresencePeers(roomState.presence);
        setRecentOps(roomState.recent_ops);
        if (roomState.elements.length > 0 && !selectedLayerId) {
          setSelectedLayerId(roomState.elements[0].id);
        }
      }
    } catch (err: any) {
      showToast(`Failed to load Collaborative Canvas topology: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedRoomId, selectedLayerId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle switching room
  const handleSelectRoom = async (roomId: string) => {
    setSelectedRoomId(roomId);
    try {
      const state = await api.adminOps.getCanvasRoomState(roomId);
      setSelectedRoom(state.room);
      setElements(state.elements);
      setPresencePeers(state.presence);
      setRecentOps(state.recent_ops);
      if (state.elements.length > 0) {
        setSelectedLayerId(state.elements[0].id);
      } else {
        setSelectedLayerId(null);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Create Room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const initialLayers: CanvasLayerElement[] = [
        {
          id: `layer-${Date.now().toString(36)}-bg`,
          type: 'shape',
          name: 'Hero Card Background',
          x: 20,
          y: 20,
          width: 380,
          height: 240,
          rotation: 0,
          opacity: 1,
          zIndex: 0,
          props: { fill: '#1e1b4b', borderRadius: 12 },
        },
        {
          id: `layer-${Date.now().toString(36)}-txt`,
          type: 'text',
          name: 'Headline Text',
          x: 50,
          y: 70,
          width: 320,
          height: 60,
          rotation: 0,
          opacity: 1,
          zIndex: 1,
          props: { text: 'Next-Gen Creative Ops', color: '#38bdf8', fontSize: 24, fontWeight: 700 },
        },
      ];

      const newRoom = await api.adminOps.createCanvasRoom({
        room_name: newRoomName,
        target_brand_id: newRoomBrandId,
        template_id: newRoomTemplateId || undefined,
        initial_elements: initialLayers,
      });

      showToast(`Canvas room '${newRoom.room_name}' provisioned`, 'success');
      setShowCreateRoomModal(false);
      setSelectedRoomId(newRoom.id);
      await loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Apply Transform Op (e.g. Move layer)
  const handleMoveLayer = async (dx: number, dy: number) => {
    if (!selectedRoom || !selectedLayerId) return;
    const targetLayer = elements.find((el) => el.id === selectedLayerId);
    if (!targetLayer) return;

    setSimulatingOp(true);
    try {
      const newX = Math.max(0, targetLayer.x + dx);
      const newY = Math.max(0, targetLayer.y + dy);

      const res = await api.adminOps.applyCanvasOp({
        room_id: selectedRoom.id,
        client_id: 'client-superadmin-console',
        op_type: 'update_transform',
        target_layer_id: selectedLayerId,
        base_revision: selectedRoom.current_revision,
        payload: { x: newX, y: newY },
      });

      setElements(res.current_elements);
      setSelectedRoom((prev) => (prev ? { ...prev, current_revision: res.new_revision } : null));
      setRecentOps((prev) => [res.applied_op, ...prev.slice(0, 49)]);
      showToast(`Dispatched OT Op: Moved layer to (${newX}, ${newY}) (v${res.new_revision})`, 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSimulatingOp(false);
    }
  };

  // Simulate Concurrent CRDT Transform Collision
  const handleSimulateCollision = async () => {
    if (!selectedRoom || !selectedLayerId) return;
    const targetLayer = elements.find((el) => el.id === selectedLayerId);
    if (!targetLayer) return;

    setSimulatingCollision(true);
    try {
      // Intentionally send an older base_revision to trigger CRDT transform adaptation
      const staleRevision = Math.max(0, selectedRoom.current_revision - 2);
      const res = await api.adminOps.applyCanvasOp({
        room_id: selectedRoom.id,
        client_id: 'peer-concurrent-simulator',
        op_type: 'update_transform',
        target_layer_id: selectedLayerId,
        base_revision: staleRevision,
        payload: {
          x: targetLayer.x + 15,
          y: targetLayer.y + 15,
          rotation: (targetLayer.rotation || 0) + 2,
        },
      });

      setElements(res.current_elements);
      setSelectedRoom((prev) => (prev ? { ...prev, current_revision: res.new_revision } : null));
      setRecentOps((prev) => [res.applied_op, ...prev.slice(0, 49)]);
      showToast(
        `CRDT Convergence: Adapted concurrent transform against stale base v${staleRevision} -> resolved to v${res.new_revision}`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSimulatingCollision(false);
    }
  };

  // Add Layer
  const handleAddLayer = async (type: 'text' | 'shape' | 'image') => {
    if (!selectedRoom) return;
    setSimulatingOp(true);
    try {
      const layerId = `layer-${Date.now().toString(36)}-${type}`;
      const payload: Partial<CanvasLayerElement> = {
        type,
        name: type === 'text' ? 'Dynamic Subheading' : type === 'image' ? 'Product Sticker' : 'Decorative Banner',
        x: 60,
        y: 120 + elements.length * 20,
        width: type === 'text' ? 280 : 200,
        height: type === 'text' ? 48 : 120,
        rotation: 0,
        opacity: 1,
        zIndex: elements.length,
        props:
          type === 'text'
            ? { text: 'Limited Edition Release', color: '#10b981', fontSize: 18 }
            : type === 'image'
            ? { url: 'https://cdn.hoaspforge.com/assets/sample_badge.png', cornerRadius: 8 }
            : { fill: '#4f46e5', borderRadius: 8 },
      };

      const res = await api.adminOps.applyCanvasOp({
        room_id: selectedRoom.id,
        client_id: 'client-superadmin-console',
        op_type: 'insert_layer',
        target_layer_id: layerId,
        base_revision: selectedRoom.current_revision,
        payload,
      });

      setElements(res.current_elements);
      setSelectedLayerId(layerId);
      setSelectedRoom((prev) => (prev ? { ...prev, current_revision: res.new_revision } : null));
      setRecentOps((prev) => [res.applied_op, ...prev.slice(0, 49)]);
      showToast(`Inserted layer '${layerId}' (v${res.new_revision})`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSimulatingOp(false);
    }
  };

  // Simulate Presence Heartbeat / Cursor Move
  const handleSimulateHeartbeat = async () => {
    if (!selectedRoom) return;
    setSimulatingHeartbeat(true);
    try {
      const randomX = Math.round(Math.random() * 400 * 10) / 10;
      const randomY = Math.round(Math.random() * 300 * 10) / 10;

      const res = await api.adminOps.updateCanvasPresence({
        room_id: selectedRoom.id,
        cursor_position_x: randomX,
        cursor_position_y: randomY,
        current_selected_layer_id: selectedLayerId,
      });

      setPresencePeers(res.peers);
      showToast(`Presence heartbeat broadcasted: Cursor at (${randomX}, ${randomY})`, 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSimulatingHeartbeat(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-flex', color: '#6366f1' }}>
              <Palette size={24} />
            </span>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>
              Multi-Tenant Real-Time Collaborative Canvas & Presence Gateway
            </h2>
            <span
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                border: '1px solid rgba(99, 102, 241, 0.3)',
              }}
            >
              v6.5.0 OT/CRDT
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
            Sub-millisecond Operational Transformation (OT), state vector CRDT convergence, and multi-peer cursor synchronization gateway.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => loadData()}
            disabled={loading}
            style={{
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ display: 'inline-flex' }}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></span>
            Refresh Gateway
          </button>

          <button
            onClick={() => setShowCreateRoomModal(true)}
            style={{
              backgroundColor: '#6366f1',
              color: '#ffffff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ display: 'inline-flex' }}><Plus size={14} /></span>
            Create Canvas Room
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '12px' }}>
            <span>ACTIVE ROOMS</span>
            <span style={{ display: 'inline-flex', color: '#6366f1' }}><Palette size={16} /></span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc', marginTop: '6px' }}>
            {telemetry?.total_active_rooms ?? rooms.length}
          </div>
          <div style={{ color: '#10b981', fontSize: '11px', marginTop: '4px' }}>
            Multi-tenant collaborative workspaces
          </div>
        </div>

        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '12px' }}>
            <span>CONNECTED PEERS</span>
            <span style={{ display: 'inline-flex', color: '#38bdf8' }}><Users size={16} /></span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc', marginTop: '6px' }}>
            {telemetry?.total_concurrent_peers ?? presencePeers.length}
          </div>
          <div style={{ color: '#38bdf8', fontSize: '11px', marginTop: '4px' }}>
            Active SSE/WebSocket heartbeats
          </div>
        </div>

        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '12px' }}>
            <span>24H OPS PROCESSED</span>
            <span style={{ display: 'inline-flex', color: '#a855f7' }}><Layers size={16} /></span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc', marginTop: '6px' }}>
            {telemetry?.total_ops_processed_24h ?? recentOps.length}
          </div>
          <div style={{ color: '#a855f7', fontSize: '11px', marginTop: '4px' }}>
            Transforms, inserts & style changes
          </div>
        </div>

        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '12px' }}>
            <span>CRDT RESOLUTION / LATENCY</span>
            <span style={{ display: 'inline-flex', color: '#10b981' }}><Zap size={16} /></span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#f8fafc', marginTop: '6px' }}>
            {telemetry?.crdt_conflict_resolution_rate ?? 99.98}%
          </div>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>
            {telemetry?.avg_op_propagation_latency_ms ?? 18.4}ms avg op propagation
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
        <button
          onClick={() => setSubTab('sandbox')}
          style={{
            backgroundColor: subTab === 'sandbox' ? '#1e293b' : 'transparent',
            color: subTab === 'sandbox' ? '#6366f1' : '#94a3b8',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ display: 'inline-flex' }}><Sparkles size={14} /></span>
          Interactive Multi-User Canvas Sandbox
        </button>

        <button
          onClick={() => setSubTab('rooms')}
          style={{
            backgroundColor: subTab === 'rooms' ? '#1e293b' : 'transparent',
            color: subTab === 'rooms' ? '#6366f1' : '#94a3b8',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ display: 'inline-flex' }}><Palette size={14} /></span>
          Active Canvas Rooms ({rooms.length})
        </button>

        <button
          onClick={() => setSubTab('presence')}
          style={{
            backgroundColor: subTab === 'presence' ? '#1e293b' : 'transparent',
            color: subTab === 'presence' ? '#6366f1' : '#94a3b8',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ display: 'inline-flex' }}><MousePointer size={14} /></span>
          Peer Presence & Cursor Gateway ({presencePeers.length})
        </button>

        <button
          onClick={() => setSubTab('ops_stream')}
          style={{
            backgroundColor: subTab === 'ops_stream' ? '#1e293b' : 'transparent',
            color: subTab === 'ops_stream' ? '#6366f1' : '#94a3b8',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ display: 'inline-flex' }}><History size={14} /></span>
          OT / CRDT Operation Stream ({recentOps.length})
        </button>
      </div>

      {/* Sub-Tab 1: Interactive Multi-User Canvas Sandbox */}
      {subTab === 'sandbox' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 340px', gap: '20px' }}>
          {/* Main Visual Board Preview */}
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
                  Live Document Canvas Viewport
                </h3>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  Room: <span style={{ color: '#6366f1', fontWeight: 600 }}>{selectedRoom?.room_name || 'No Room Selected'}</span> | Revision: <span style={{ color: '#10b981', fontWeight: 600 }}>v{selectedRoom?.current_revision ?? 0}</span>
                </div>
              </div>

              {/* Room Selector Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Switch Room:</span>
                <select
                  value={selectedRoomId}
                  onChange={(e) => handleSelectRoom(e.target.value)}
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '12px',
                  }}
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.room_name} (rev {r.current_revision})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Visual Canvas Board Frame */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '420px',
                backgroundColor: '#090d16',
                borderRadius: '8px',
                border: '2px dashed #334155',
                overflow: 'hidden',
                backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            >
              {/* Layers Rendered */}
              {elements.map((el) => {
                const isSelected = el.id === selectedLayerId;
                return (
                  <div
                    key={el.id}
                    onClick={() => setSelectedLayerId(el.id)}
                    style={{
                      position: 'absolute',
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${el.width}px`,
                      height: `${el.height}px`,
                      transform: `rotate(${el.rotation || 0}deg)`,
                      opacity: el.opacity !== undefined ? el.opacity : 1,
                      zIndex: el.zIndex || 1,
                      cursor: 'pointer',
                      border: isSelected ? '2px solid #6366f1' : '1px solid transparent',
                      boxShadow: isSelected ? '0 0 12px rgba(99, 102, 241, 0.5)' : 'none',
                      borderRadius: el.props?.borderRadius || (el.props?.cornerRadius ?? 4),
                      backgroundColor: el.props?.fill || (el.type === 'shape' ? '#334155' : 'transparent'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px',
                      boxSizing: 'border-box',
                      transition: 'all 0.15s ease-out',
                      userSelect: 'none',
                    }}
                  >
                    {el.type === 'text' && (
                      <span
                        style={{
                          color: el.props?.color || '#f8fafc',
                          fontSize: `${el.props?.fontSize || 16}px`,
                          fontWeight: el.props?.fontWeight || 600,
                          textAlign: 'center',
                          lineHeight: 1.2,
                        }}
                      >
                        {el.props?.text || el.name}
                      </span>
                    )}

                    {el.type === 'image' && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                        <span style={{ display: 'inline-flex' }}><ImageIcon size={28} /></span>
                        <span style={{ fontSize: '11px', color: '#cbd5e1' }}>{el.name}</span>
                      </div>
                    )}

                    {el.type === 'shape' && (
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {el.name}
                      </div>
                    )}

                    {isSelected && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '-18px',
                          left: '0',
                          backgroundColor: '#6366f1',
                          color: '#fff',
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '3px',
                          fontWeight: 600,
                        }}
                      >
                        {el.name} ({el.x}, {el.y})
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Render Connected Peers Live Cursors */}
              {presencePeers.map((peer, idx) => {
                const colors = ['#f43f5e', '#10b981', '#38bdf8', '#fbbf24', '#a855f7'];
                const cursorColor = colors[idx % colors.length];
                const clampX = Math.min(Math.max(10, peer.cursor_position_x), 600);
                const clampY = Math.min(Math.max(10, peer.cursor_position_y), 380);

                return (
                  <div
                    key={peer.id}
                    style={{
                      position: 'absolute',
                      left: `${clampX}px`,
                      top: `${clampY}px`,
                      pointerEvents: 'none',
                      zIndex: 99,
                      transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={cursorColor} stroke="#ffffff" strokeWidth="1.5">
                      <path d="M3 3l7 18 3-7 7-3L3 3z" />
                    </svg>
                    <div
                      style={{
                        position: 'absolute',
                        left: '16px',
                        top: '12px',
                        backgroundColor: cursorColor,
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                      }}
                    >
                      {peer.display_name.split(' ')[0]}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Action Toolbar */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Add Layer:</span>
              <button
                onClick={() => handleAddLayer('text')}
                disabled={simulatingOp}
                style={{
                  backgroundColor: '#0f172a',
                  color: '#38bdf8',
                  border: '1px solid #334155',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ display: 'inline-flex' }}><Type size={12} /></span>
                Text
              </button>

              <button
                onClick={() => handleAddLayer('shape')}
                disabled={simulatingOp}
                style={{
                  backgroundColor: '#0f172a',
                  color: '#a855f7',
                  border: '1px solid #334155',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ display: 'inline-flex' }}><Square size={12} /></span>
                Shape
              </button>

              <button
                onClick={() => handleAddLayer('image')}
                disabled={simulatingOp}
                style={{
                  backgroundColor: '#0f172a',
                  color: '#10b981',
                  border: '1px solid #334155',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ display: 'inline-flex' }}><ImageIcon size={12} /></span>
                Image
              </button>

              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSimulateHeartbeat}
                  disabled={simulatingHeartbeat}
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ display: 'inline-flex' }}><MousePointer size={12} /></span>
                  Broadcast Cursor Pulse
                </button>
              </div>
            </div>
          </div>

          {/* Right Inspector & OT Controller */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Layer Inspector Panel */}
            <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                  Layer Transform Inspector
                </h4>
                <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600 }}>
                  {elements.length} layers
                </span>
              </div>

              {selectedLayerId ? (
                (() => {
                  const activeLayer = elements.find((l) => l.id === selectedLayerId);
                  if (!activeLayer) return <div style={{ color: '#94a3b8', fontSize: '12px' }}>No layer selected</div>;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #334155' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>{activeLayer.name}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                          ID: {activeLayer.id} | Type: {activeLayer.type}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '8px', fontSize: '11px', color: '#cbd5e1' }}>
                          <div>X: {activeLayer.x}px</div>
                          <div>Y: {activeLayer.y}px</div>
                          <div>Width: {activeLayer.width}px</div>
                          <div>Height: {activeLayer.height}px</div>
                        </div>
                      </div>

                      {/* Directional Nudge Pad */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <button
                          onClick={() => handleMoveLayer(0, -20)}
                          style={{ backgroundColor: '#0f172a', color: '#f8fafc', border: '1px solid #334155', padding: '4px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                        >
                          ▲ Up
                        </button>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleMoveLayer(-20, 0)}
                            style={{ backgroundColor: '#0f172a', color: '#f8fafc', border: '1px solid #334155', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                          >
                            ◀ Left
                          </button>
                          <button
                            onClick={() => handleMoveLayer(20, 0)}
                            style={{ backgroundColor: '#0f172a', color: '#f8fafc', border: '1px solid #334155', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                          >
                            Right ▶
                          </button>
                        </div>
                        <button
                          onClick={() => handleMoveLayer(0, 20)}
                          style={{ backgroundColor: '#0f172a', color: '#f8fafc', border: '1px solid #334155', padding: '4px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                        >
                          ▼ Down
                        </button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div style={{ color: '#94a3b8', fontSize: '12px' }}>Select an element on canvas to inspect</div>
              )}
            </div>

            {/* CRDT Concurrency Simulator */}
            <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', marginBottom: '8px' }}>
                <span style={{ display: 'inline-flex' }}><Shuffle size={16} /></span>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>
                  CRDT Concurrent Collision Drill
                </h4>
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                Dispatches a concurrent transform using an outdated base revision. Demonstrates CRDT state vector transformation adaptation without loss of user intent.
              </p>
              <button
                onClick={handleSimulateCollision}
                disabled={simulatingCollision || !selectedLayerId}
                style={{
                  width: '100%',
                  backgroundColor: '#f59e0b',
                  color: '#0f172a',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: simulatingCollision || !selectedLayerId ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ display: 'inline-flex' }}><Zap size={14} /></span>
                Trigger Concurrent Collision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Active Canvas Rooms */}
      {subTab === 'rooms' && (
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
              Registered Collaborative Canvas Rooms
            </h3>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              {rooms.length} active multi-tenant rooms
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Room Name</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Target Brand</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Template Binding</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Revision</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Active Peers</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr
                    key={room.id}
                    style={{
                      borderBottom: '1px solid #334155',
                      backgroundColor: selectedRoomId === room.id ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px 16px', color: '#f8fafc', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'inline-flex', color: '#6366f1' }}><Palette size={14} /></span>
                        {room.room_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{room.id}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{room.target_brand_id}</td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{room.template_id || 'None'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          backgroundColor: 'rgba(99, 102, 241, 0.15)',
                          color: '#818cf8',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        v{room.current_revision}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ color: room.active_peers_count > 0 ? '#10b981' : '#64748b', fontWeight: 600 }}>
                        {room.active_peers_count} online
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          backgroundColor: room.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                          color: room.status === 'active' ? '#34d399' : '#94a3b8',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        {room.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => {
                          handleSelectRoom(room.id);
                          setSubTab('sandbox');
                        }}
                        style={{
                          backgroundColor: '#0f172a',
                          color: '#f8fafc',
                          border: '1px solid #334155',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        Open Canvas
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Peer Presence & Cursor Gateway */}
      {subTab === 'presence' && (
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
              Real-Time Peer Presence Sessions (Room: {selectedRoom?.room_name})
            </h3>
            <button
              onClick={handleSimulateHeartbeat}
              disabled={simulatingHeartbeat}
              style={{
                backgroundColor: '#0f172a',
                color: '#38bdf8',
                border: '1px solid #334155',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ display: 'inline-flex' }}><MousePointer size={12} /></span>
              Pulse My Presence
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {presencePeers.map((peer, idx) => (
              <div
                key={peer.id}
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '13px' }}>
                    {peer.display_name}
                  </div>
                  <span
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 600,
                    }}
                  >
                    {peer.connection_status}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{peer.user_email}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1', borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
                  <span>Cursor: ({peer.cursor_position_x}, {peer.cursor_position_y})</span>
                  <span>Layer: {peer.current_selected_layer_id || 'none'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 4: OT / CRDT Operation Stream */}
      {subTab === 'ops_stream' && (
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
              Operational Transformation Mutation Log (Room: {selectedRoom?.room_name})
            </h3>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Showing {recentOps.length} recent operations
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Revision</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Op Type</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Target Layer</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Client ID</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Base Rev</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600 }}>Payload Delta</th>
                </tr>
              </thead>
              <tbody>
                {recentOps.map((op) => (
                  <tr key={op.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>v{op.applied_revision}</span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span
                        style={{
                          backgroundColor:
                            op.op_type === 'insert_layer'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : op.op_type === 'update_transform'
                              ? 'rgba(56, 189, 248, 0.15)'
                              : 'rgba(168, 85, 247, 0.15)',
                          color:
                            op.op_type === 'insert_layer'
                              ? '#34d399'
                              : op.op_type === 'update_transform'
                              ? '#38bdf8'
                              : '#c084fc',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        {op.op_type}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#f8fafc' }}>{op.target_layer_id}</td>
                    <td style={{ padding: '10px 16px', color: '#94a3b8' }}>{op.client_id}</td>
                    <td style={{ padding: '10px 16px', color: '#94a3b8' }}>v{op.base_revision}</td>
                    <td style={{ padding: '10px 16px', color: '#cbd5e1', fontFamily: 'monospace', fontSize: '11px' }}>
                      {JSON.stringify(op.payload)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateRoomModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '24px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
                Create Collaborative Canvas Room
              </h3>
              <button
                onClick={() => setShowCreateRoomModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <span style={{ display: 'inline-flex' }}><X size={18} /></span>
              </button>
            </div>

            <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
                  Room Name
                </label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
                  Target Brand ID
                </label>
                <input
                  type="text"
                  value={newRoomBrandId}
                  onChange={(e) => setNewRoomBrandId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
                  Template ID (Optional)
                </label>
                <input
                  type="text"
                  value={newRoomTemplateId}
                  onChange={(e) => setNewRoomTemplateId(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateRoomModal(false)}
                  style={{
                    backgroundColor: '#334155',
                    color: '#f8fafc',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Provision Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
