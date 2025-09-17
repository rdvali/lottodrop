import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import FilterSection, { FilterField } from '../components/FilterSection';
import './Rounds.css';

interface Participant {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  bet_amount: string;
  is_winner: boolean;
}

interface Round {
  id: string;
  room_id: string;
  room_name: string;
  server_seed: string;
  prize_pool: string;
  winner_id: string | null;
  winner_name: string | null;
  commission_amount: string | null;
  result_hash: string | null;
  completed_at: string | null;
  created_at: string;
  participant_count: number;
  room_type: string;
  bet_amount: string;
}

interface RoundDetails extends Round {
  participants: Participant[];
}

const Rounds: React.FC = () => {
  const { token } = useAuth();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<RoundDetails | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'active'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchRounds();
  }, [currentPage, statusFilter, searchTerm, filters, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRounds = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        status: statusFilter,
        search: searchTerm,
      });
      
      // Add filter parameters
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

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/admin/rounds?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRounds(data.rounds);
        setTotalPages(data.totalPages);
      } else {
        toast.error('Failed to fetch rounds');
      }
    } catch (error) {
      console.error('Fetch rounds error:', error);
      toast.error('Failed to fetch rounds');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoundDetails = async (roundId: string) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/admin/rounds/${roundId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedRound(data.round);
        setShowModal(true);
      } else {
        toast.error('Failed to fetch round details');
      }
    } catch (error) {
      console.error('Fetch round details error:', error);
      toast.error('Failed to fetch round details');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Ongoing';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: string | null) => {
    if (!amount) return '$0.00';
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const getStatusBadge = (completedAt: string | null) => {
    if (completedAt) {
      return <span className="badge badge-success">Completed</span>;
    }
    return <span className="badge badge-warning">Active</span>;
  };

  const getDiceBearAvatar = (userId: string): string => {
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`;
  };

  // Filter configuration - stable reference, no dependencies
  const filterFields: FilterField[] = useMemo(() => [
    {
      type: 'text' as const,
      key: 'search',
      label: 'Search Rounds',
      placeholder: 'Search by room name or winner...'
    },
    {
      type: 'select' as const,
      key: 'status',
      label: 'Round Status',
      options: [
        { value: 'completed', label: 'Completed' },
        { value: 'active', label: 'Active' }
      ]
    },
    {
      type: 'select' as const,
      key: 'room_type',
      label: 'Room Type',
      options: [
        { value: 'FAST_DROP', label: 'Fast Drop' },
        { value: 'TIME_DROP', label: 'Time Drop' }
      ]
    },
    {
      type: 'boolean' as const,
      key: 'has_winner',
      label: 'Has Winner',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' }
      ]
    },
    {
      type: 'numericRange' as const,
      key: 'prize_pool',
      label: 'Prize Pool ($)'
    },
    {
      type: 'numericRange' as const,
      key: 'participant_count',
      label: 'Number of Players'
    },
    {
      type: 'dateRange' as const,
      key: 'date_range',
      label: 'Date Range'
    }
  ], []); // Empty dependency array - creates stable reference

  const handleFilterChange = useCallback((newFilters: Record<string, any>) => {
    // Handle special filters
    if (newFilters.search !== undefined) {
      setSearchTerm(newFilters.search);
      delete newFilters.search;
    }
    if (newFilters.status !== undefined) {
      setStatusFilter(newFilters.status || 'all');
      delete newFilters.status;
    }
    
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setFilters({});
    setCurrentPage(1);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (statusFilter !== 'all') count++;
    count += Object.keys(filters).length;
    return count;
  }, [searchTerm, statusFilter, filters]);

  if (loading) {
    return (
      <div className="rounds-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading rounds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounds-page">
      <div className="page-header">
        <div className="header-content">
          <h1>🎲 Game Rounds</h1>
          <p>View and manage all game rounds history</p>
        </div>
      </div>

      <FilterSection
        fields={filterFields}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        activeFilterCount={activeFilterCount}
      />
      
      <div className="filters-section">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Rounds
          </button>
          <button
            className={`filter-tab ${statusFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setStatusFilter('completed')}
          >
            Completed
          </button>
          <button
            className={`filter-tab ${statusFilter === 'active' ? 'active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Active
          </button>
        </div>
      </div>

      <div className="rounds-table-container">
        <table className="rounds-table">
          <thead>
            <tr>
              <th>Round ID</th>
              <th>Room</th>
              <th>Type</th>
              <th>Prize Pool</th>
              <th>Players</th>
              <th>Winner</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((round) => (
              <tr key={round.id}>
                <td className="round-id">#{round.id.slice(0, 8)}</td>
                <td>{round.room_name}</td>
                <td>
                  <span className={`room-type ${round.room_type.toLowerCase()}`}>
                    {round.room_type.replace('_', ' ')}
                  </span>
                </td>
                <td className="prize-pool">{formatCurrency(round.prize_pool)}</td>
                <td>{round.participant_count}</td>
                <td>
                  {round.winner_name ? (
                    <div className="winner-info">
                      <span>🏆 {round.winner_name}</span>
                    </div>
                  ) : (
                    <span className="no-winner">-</span>
                  )}
                </td>
                <td>{getStatusBadge(round.completed_at)}</td>
                <td>{formatDate(round.completed_at || round.created_at)}</td>
                <td>
                  <button
                    className="view-details-btn"
                    onClick={() => fetchRoundDetails(round.id)}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rounds.length === 0 && (
          <div className="no-data">
            <p>No rounds found</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {/* Round Details Modal */}
      {showModal && selectedRound && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Round Details</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="detail-section">
                <h3>Round Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Round ID:</label>
                    <span>{selectedRound.id}</span>
                  </div>
                  <div className="detail-item">
                    <label>Room:</label>
                    <span>{selectedRound.room_name}</span>
                  </div>
                  <div className="detail-item">
                    <label>Type:</label>
                    <span>{selectedRound.room_type}</span>
                  </div>
                  <div className="detail-item">
                    <label>Bet Amount:</label>
                    <span>{formatCurrency(selectedRound.bet_amount)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Prize Pool:</label>
                    <span className="highlight">{formatCurrency(selectedRound.prize_pool)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Commission:</label>
                    <span>{formatCurrency(selectedRound.commission_amount)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Status:</label>
                    <span>{getStatusBadge(selectedRound.completed_at)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Created:</label>
                    <span>{formatDate(selectedRound.created_at)}</span>
                  </div>
                  {selectedRound.completed_at && (
                    <div className="detail-item">
                      <label>Completed:</label>
                      <span>{formatDate(selectedRound.completed_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedRound.server_seed && (
                <div className="detail-section">
                  <h3>Provably Fair</h3>
                  <div className="detail-grid">
                    <div className="detail-item full-width">
                      <label>Server Seed:</label>
                      <code className="seed-display">{selectedRound.server_seed}</code>
                    </div>
                    {selectedRound.result_hash && (
                      <div className="detail-item full-width">
                        <label>Result Hash:</label>
                        <code className="seed-display">{selectedRound.result_hash}</code>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="detail-section">
                <h3>Participants ({selectedRound.participants?.length || 0})</h3>
                <div className="participants-list">
                  {selectedRound.participants?.map((participant) => (
                    <div 
                      key={participant.user_id} 
                      className={`participant-card ${participant.is_winner ? 'winner' : ''}`}
                    >
                      <img
                        src={getDiceBearAvatar(participant.user_id)}
                        alt={participant.first_name}
                        className="participant-avatar"
                      />
                      <div className="participant-info">
                        <div className="participant-name">
                          {participant.first_name} {participant.last_name}
                          {participant.is_winner && <span className="winner-badge">🏆 Winner</span>}
                        </div>
                        <div className="participant-email">{participant.email}</div>
                        <div className="participant-bet">Bet: {formatCurrency(participant.bet_amount)}</div>
                      </div>
                      {participant.is_winner && selectedRound.prize_pool && (
                        <div className="winnings">
                          Won: {formatCurrency(
                            (parseFloat(selectedRound.prize_pool) - parseFloat(selectedRound.commission_amount || '0')).toString()
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rounds;