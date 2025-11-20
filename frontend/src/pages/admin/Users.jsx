import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { FaSearch, FaEdit, FaTrash, FaUserShield, FaUser, FaSpinner } from 'react-icons/fa';
import './Admin.css';

const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });

  const fetchUsers = async (page = 1, search = '') => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await api.get(`/admin/users?page=${page}&limit=${pagination.limit}&search=${search}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data) {
        setUsers(response.data.users || []);
        setPagination({
          ...pagination,
          page: response.data.page || 1,
          total: response.data.total || 0,
          totalPages: response.data.totalPages || 1
        });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users. Please try again.');
      
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if user is authenticated and is admin
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    
    fetchUsers();
  }, [navigate]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(1, searchTerm);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchUsers(newPage, searchTerm);
    }
  };

  // const handleRoleChange = async (userId, newRole) => {
  //   try {
  //     const token = localStorage.getItem('token');
  //     await api.put(
  //       `/admin/users/${userId}/role`, 
  //       { role: newRole },
  //       {
  //         headers: {
  //           'Content-Type': 'application/json',
  //           'Authorization': `Bearer ${token}`
  //         }
  //       }
  //     );
  //     // Update the local state to reflect the change immediately
  //     setUsers(users.map(user => 
  //       user._id === userId ? { ...user, role: newRole } : user
  //     ));
  //   } catch (error) {
  //     console.error('Error updating user role:', error);
  //     setError('Failed to update user role. Please try again.');
  //   }
  // };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        const token = localStorage.getItem('token');
        await api.delete(`/admin/users/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        // Remove the user from the local state
        setUsers(users.filter(user => user._id !== userId));
        setPagination(prev => ({
          ...prev,
          total: prev.total - 1
        }));
      } catch (error) {
        console.error('Error deleting user:', error);
        setError('Failed to delete user. Please try again.');
      }
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="admin-users">
        <div className="admin-header">
          <h1>Manage Users</h1>
        </div>
        <div className="loading">
          <FaSpinner className="spinner" />
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-users">
      <div className="admin-header">
        <h1>Manage Users</h1>
        {error && (
          <div className="error-message">
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <button type="submit" className="search-button">
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <div className="loading">Loading users...</div>
      ) : (
        <>
          <div className="users-table-container">
            {users.length === 0 ? (
              <div className="no-results">
                <p>No users found</p>
              </div>
            ) : (
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{(user.role || '').toUpperCase()}</td>
                      <td className="actions">
                        {user.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user._id)}
                            className="action-button delete"
                            title="Delete User"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="pagination-button"
              >
                Previous
              </button>
              <span className="page-info">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="pagination-button"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Users;
