import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import FilterSection, { FilterField } from '../components/FilterSection';
import './Rooms.css';

interface Room {
  id: string;
  name: string;
  type: string;
  bet_amount: string;
  min_players: number;
  max_players: number;
  number_of_winners: number;
  status: string;
  is_active: boolean;
  player_count: number;
  total_games: number;
  total_bets: string;
  platform_fee_rate: string;
  commission_rate?: string; // For backward compatibility
  created_at: string;
  start_time: string | null;
}

const Rooms: React.FC = () => {
  const { token } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'FAST_DROP',
    betAmount: '',
    minPlayers: 2,
    maxPlayers: 10,
    numberOfWinners: 1,
    platformFeeRate: 5,
    isActive: true,
    startTime: '',
  });

  useEffect(() => {
    fetchRooms();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRooms = async () => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          if (typeof value === 'object') {
            // Handle range filters
            if (value.min) params.append(`${key}_min`, value.min);
            if (value.max) params.append(`${key}_max`, value.max);
            if (value.startDate) params.append(`${key}_start`, value.startDate);
            if (value.endDate) params.append(`${key}_end`, value.endDate);
          } else {
            params.append(key, value);
          }
        }
      });
      
      const queryString = params.toString();
      const url = `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/admin/rooms${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRooms(data.rooms);
      } else {
        toast.error('Failed to fetch rooms');
      }
    } catch (error) {
      console.error('Fetch rooms error:', error);
      toast.error('Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/admin/rooms`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name,
            type: formData.type,
            betAmount: formData.betAmount,
            minPlayers: formData.minPlayers,
            maxPlayers: formData.maxPlayers,
            numberOfWinners: formData.numberOfWinners,
            platformFeeRate: formData.platformFeeRate,
            isActive: formData.isActive,
            startTime: formData.type === 'TIME_DROP' ? formData.startTime : null,
          }),
        }
      );

      if (response.ok) {
        toast.success('Room created successfully');
        setShowCreateModal(false);
        fetchRooms();
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create room');
      }
    } catch (error) {
      console.error('Create room error:', error);
      toast.error('Failed to create room');
    }
  };

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/admin/rooms/${selectedRoom.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name,
            betAmount: formData.betAmount,
            minPlayers: formData.minPlayers,
            maxPlayers: formData.maxPlayers,
            numberOfWinners: formData.numberOfWinners,
            platformFeeRate: formData.platformFeeRate,
            isActive: formData.isActive,
            status: selectedRoom.status,
          }),
        }
      );

      if (response.ok) {
        toast.success('Room updated successfully');
        setShowEditModal(false);
        fetchRooms();
        resetForm();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update room');
      }
    } catch (error) {
      console.error('Update room error:', error);
      toast.error('Failed to update room');
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/admin/rooms/${roomId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        toast.success('Room deleted successfully');
        fetchRooms();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete room');
      }
    } catch (error) {
      console.error('Delete room error:', error);
      toast.error('Failed to delete room');
    }
  };

  const openEditModal = (room: Room) => {
    setSelectedRoom(room);
    setFormData({
      name: room.name,
      type: room.type,
      betAmount: room.bet_amount,
      minPlayers: room.min_players,
      maxPlayers: room.max_players,
      numberOfWinners: room.number_of_winners || 1,
      platformFeeRate: parseFloat(room.platform_fee_rate || room.commission_rate || '0.05') * 100,
      isActive: room.is_active !== undefined ? room.is_active : true,
      startTime: room.start_time || '',
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'FAST_DROP',
      betAmount: '',
      minPlayers: 2,
      maxPlayers: 10,
      numberOfWinners: 1,
      platformFeeRate: 5,
      isActive: true,
      startTime: '',
    });
    setSelectedRoom(null);
  };

  const formatCurrency = (amount: string) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      WAITING: 'badge-waiting',
      ACTIVE: 'badge-active',
      COMPLETED: 'badge-completed',
      CANCELLED: 'badge-cancelled',
    };
    return (
      <span className={`badge ${statusClasses[status as keyof typeof statusClasses] || ''}`}>
        {status}
      </span>
    );
  };

  const getRoomTypeBadge = (type: string) => {
    return (
      <span className={`room-type ${type.toLowerCase().replace('_', '-')}`}>
        {type.replace('_', ' ')}
      </span>
    );
  };

  // Filter configuration
  const filterFields: FilterField[] = useMemo(() => [
    {
      type: 'text',
      key: 'search',
      label: 'Search Rooms',
      placeholder: 'Search by room name...'
    },
    {
      type: 'select',
      key: 'status',
      label: 'Room Status',
      options: [
        { value: 'WAITING', label: 'Waiting' },
        { value: 'ACTIVE', label: 'Active' },
        { value: 'COMPLETED', label: 'Completed' },
        { value: 'CANCELLED', label: 'Cancelled' }
      ]
    },
    {
      type: 'select',
      key: 'type',
      label: 'Room Type',
      options: [
        { value: 'FAST_DROP', label: 'Fast Drop' },
        { value: 'TIME_DROP', label: 'Time Drop' }
      ]
    },
    {
      type: 'select',
      key: 'is_active',
      label: 'Active State',
      options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' }
      ]
    },
    {
      type: 'numericRange',
      key: 'bet_amount',
      label: 'Bet Amount ($)'
    },
    {
      type: 'numericRange',
      key: 'player_capacity',
      label: 'Player Capacity'
    },
    {
      type: 'numericRange',
      key: 'number_of_winners',
      label: 'Number of Winners'
    },
    {
      type: 'dateRange',
      key: 'created_date',
      label: 'Created Date'
    }
  ], []);

  const handleFilterChange = useCallback((newFilters: Record<string, any>) => {
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const activeFilterCount = useMemo(() => {
    return Object.keys(filters).length;
  }, [filters]);

  if (loading) {
    return (
      <div className="rooms-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rooms-page">
      <div className="page-header">
        <div className="header-content">
          <h1>🎮 Game Rooms</h1>
          <p>Manage all game rooms and their settings</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + Create Room
        </button>
      </div>

      <FilterSection
        fields={filterFields}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        activeFilterCount={activeFilterCount}
      />

      <div className="rooms-grid">
        {rooms.map((room) => (
          <div key={room.id} className="room-card">
            <div className="room-card-header">
              <h3>{room.name}</h3>
              <div className="room-badges">
                {getRoomTypeBadge(room.type)}
                <span className={`room-active-status ${room.is_active ? 'active' : 'inactive'}`}>
                  {room.is_active ? '🟢 Active' : '🔴 Inactive'}
                </span>
              </div>
            </div>
            
            <div className="room-card-stats">
              <div className="stat">
                <span className="stat-label">Bet Amount</span>
                <span className="stat-value">{formatCurrency(room.bet_amount)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Players</span>
                <span className="stat-value">{room.min_players}-{room.max_players}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Platform Fee</span>
                <span className="stat-value">{(parseFloat(room.platform_fee_rate || room.commission_rate || '0.05') * 100).toFixed(1)}%</span>
              </div>
              <div className="stat">
                <span className="stat-label">Winners</span>
                <span className="stat-value">{room.number_of_winners || 1}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Total Games</span>
                <span className="stat-value">{room.total_games || 0}</span>
              </div>
            </div>

            <div className="room-card-footer">
              <div className="room-status">
                {getStatusBadge(room.status)}
              </div>
              <div className="room-actions">
                <button 
                  className="btn-edit" 
                  onClick={() => openEditModal(room)}
                  title="Edit Room"
                >
                  ✏️
                </button>
                <button 
                  className="btn-delete" 
                  onClick={() => handleDeleteRoom(room.id)}
                  title="Delete Room"
                  disabled={room.status === 'ACTIVE'}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {rooms.length === 0 && (
        <div className="no-data">
          <p>No rooms found. Create your first room to get started!</p>
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Room</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateRoom} className="room-form">
              <div className="form-group">
                <label>Room Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Room Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="FAST_DROP">Fast Drop</option>
                    <option value="TIME_DROP">Time Drop</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Bet Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.betAmount}
                    onChange={(e) => setFormData({ ...formData, betAmount: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Min Players</label>
                  <input
                    type="number"
                    value={formData.minPlayers}
                    onChange={(e) => setFormData({ ...formData, minPlayers: parseInt(e.target.value) })}
                    min="2"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Max Players</label>
                  <input
                    type="number"
                    value={formData.maxPlayers}
                    onChange={(e) => setFormData({ ...formData, maxPlayers: parseInt(e.target.value) })}
                    min="2"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Number of Winners</label>
                  <input
                    type="number"
                    min="1"
                    max={formData.maxPlayers}
                    value={formData.numberOfWinners}
                    onChange={(e) => setFormData({ ...formData, numberOfWinners: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Platform Fee (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.platformFeeRate}
                    onChange={(e) => setFormData({ ...formData, platformFeeRate: parseFloat(e.target.value) || 0 })}
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>

              {formData.type === 'TIME_DROP' && (
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label>Room Status</label>
                <select
                  value={formData.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                  className="form-select"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Room Modal */}
      {showEditModal && selectedRoom && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Room</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleUpdateRoom} className="room-form">
              <div className="form-group">
                <label>Room Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Bet Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.betAmount}
                  onChange={(e) => setFormData({ ...formData, betAmount: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Min Players</label>
                  <input
                    type="number"
                    value={formData.minPlayers}
                    onChange={(e) => setFormData({ ...formData, minPlayers: parseInt(e.target.value) })}
                    min="2"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Max Players</label>
                  <input
                    type="number"
                    value={formData.maxPlayers}
                    onChange={(e) => setFormData({ ...formData, maxPlayers: parseInt(e.target.value) })}
                    min="2"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Number of Winners</label>
                  <input
                    type="number"
                    min="1"
                    max={formData.maxPlayers}
                    value={formData.numberOfWinners}
                    onChange={(e) => setFormData({ ...formData, numberOfWinners: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Platform Fee (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.platformFeeRate}
                    onChange={(e) => setFormData({ ...formData, platformFeeRate: parseFloat(e.target.value) || 0 })}
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Room Status</label>
                <select
                  value={formData.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                  disabled={selectedRoom.status === 'ACTIVE'}
                  className="form-select"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                {selectedRoom.status === 'ACTIVE' && (
                  <small className="form-help">Cannot deactivate room with active games</small>
                )}
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rooms;