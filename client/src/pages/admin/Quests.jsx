import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaSearch } from 'react-icons/fa';
import './Admin.css';

const Quests = () => {
  const navigate = useNavigate();
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingQuest, setEditingQuest] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    questionType: 'mcq',
    totalXP: 75,
    levels: []
  });

  // Fetch quests
  const fetchQuests = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/quests?search=${searchTerm}`);
      setQuests(response.data.quests || []);
    } catch (error) {
      console.error('Error fetching quests:', error);
      setError('Failed to load quests. Please try again.');
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchQuests();
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'totalXP' ? parseInt(value) || 0 : value
    }));
  };

  // Handle level changes
  const handleLevelChange = (index, field, value) => {
    const updatedLevels = [...formData.levels];
    updatedLevels[index] = {
      ...updatedLevels[index],
      [field]: field === 'level' || field === 'xpRequired' ? parseInt(value) || 0 : value
    };
    
    setFormData(prev => ({
      ...prev,
      levels: updatedLevels
    }));
  };

  // Add a new level
  const addLevel = () => {
    setFormData(prev => ({
      ...prev,
      levels: [
        ...prev.levels,
        { 
          level: prev.levels.length + 1, 
          xpRequired: 10, 
          description: '' 
        }
      ]
    }));
  };

  // Remove a level
  const removeLevel = (index) => {
    const updatedLevels = formData.levels.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      levels: updatedLevels
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingQuest) {
        await api.put(`/admin/quests/${editingQuest._id}`, formData);
      } else {
        await api.post('/admin/quests', formData);
      }
      
      setShowForm(false);
      setEditingQuest(null);
      resetForm();
      fetchQuests();
    } catch (error) {
      console.error('Error saving quest:', error);
      setError('Failed to save quest. Please try again.');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'general',
      questionType: 'mcq',
      totalXP: 75,
      levels: []
    });
  };

  // Handle edit quest
  const handleEditQuest = (quest) => {
    setEditingQuest(quest);
    setFormData({
      title: quest.title,
      description: quest.description,
      category: quest.category,
      questionType: quest.questionType,
      totalXP: quest.totalXP,
      levels: [...quest.levels]
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle delete quest
  const handleDeleteQuest = async (questId) => {
    if (window.confirm('Are you sure you want to delete this quest? This action cannot be undone.')) {
      try {
        await api.delete(`/admin/quests/${questId}`);
        setQuests(quests.filter(quest => quest._id !== questId));
      } catch (error) {
        console.error('Error deleting quest:', error);
        setError('Failed to delete quest. Please try again.');
      }
    }
  };

  // Cancel form
  const handleCancel = () => {
    setShowForm(false);
    setEditingQuest(null);
    resetForm();
  };

  // Load quests on component mount
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    
    fetchQuests();
  }, [navigate]);

  // Loading state
  if (loading && quests.length === 0) {
    return (
      <div className="admin-quests">
        <div className="admin-header">
          <h1>Manage Quests</h1>
        </div>
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading quests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-quests">
      <div className="quests-header">
        <h1>Manage Quests</h1>
        <button 
          className="create-quest-btn"
          onClick={() => setShowForm(true)}
          disabled={showForm}
        >
          <FaPlus /> Create New Quest
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span>{error}</span>
        </div>
      )}

      {/* Search Form */}
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search quests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <button type="submit" className="search-button">
          Search
        </button>
      </form>

      {/* Quest Creation/Edit Form */}
      {showForm && (
        <div className="quest-form-container">
          <div className="form-header">
            <h2>{editingQuest ? 'Edit Quest' : 'Create New Quest'}</h2>
            <button 
              type="button" 
              className="close-btn"
              onClick={handleCancel}
            >
              <FaTimes />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="quest-form">
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  <option value="general">General</option>
                  <option value="DSA">Data Structures & Algorithms</option>
                </select>
              </div>

              <div className="form-group">
                <label>Question Type</label>
                <select
                  name="questionType"
                  value={formData.questionType}
                  onChange={handleInputChange}
                >
                  <option value="mcq">Multiple Choice</option>
                  <option value="coding">Coding Challenge</option>
                </select>
              </div>

              <div className="form-group">
                <label>Total XP</label>
                <input
                  type="number"
                  name="totalXP"
                  value={formData.totalXP}
                  onChange={handleInputChange}
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="levels-section">
              <div className="section-header">
                <h3>Levels</h3>
                <button 
                  type="button" 
                  onClick={addLevel} 
                  className="add-level-btn"
                >
                  <FaPlus /> Add Level
                </button>
              </div>

              {formData.levels.map((level, index) => (
                <div key={index} className="level-item">
                  <div className="form-group">
                    <label>Level</label>
                    <input
                      type="number"
                      value={level.level}
                      onChange={(e) => handleLevelChange(index, 'level', e.target.value)}
                      min="1"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>XP Required</label>
                    <input
                      type="number"
                      value={level.xpRequired}
                      onChange={(e) => handleLevelChange(index, 'xpRequired', e.target.value)}
                      min="1"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Description</label>
                    <input
                      type="text"
                      value={level.description}
                      onChange={(e) => handleLevelChange(index, 'description', e.target.value)}
                      placeholder="Level description"
                      required
                    />
                  </div>
                  
                  <button
                    type="button"
                    className="remove-level"
                    onClick={() => removeLevel(index)}
                    title="Remove level"
                  >
                    ×
                  </button>
                </div>
              ))}
              
              {formData.levels.length === 0 && (
                <div className="no-levels">
                  <p>No levels added yet. Click 'Add Level' to get started.</p>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-btn">
                {editingQuest ? 'Update Quest' : 'Create Quest'}
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quests Grid */}
      <div className="quests-grid">
        {quests.length === 0 ? (
          <div className="no-quests">
            <p>No quests found. Create your first quest to get started!</p>
          </div>
        ) : (
          quests.map(quest => (
            <div key={quest._id} className="quest-card">
              <div className="quest-card-header">
                <h3>{quest.title}</h3>
              </div>
              <div className="quest-details">
                {quest.description || 'No description provided.'}
              </div>
              <div className="quest-card-body" style={{padding: 0}}>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '0.5rem', columnGap: '1.5rem'}}>
                  <div style={{color: '#6b7280'}}>Category</div>
                  <div style={{fontWeight: 'bold', textAlign: 'right'}}>{quest.category}</div>
                  <div style={{color: '#6b7280'}}>Type</div>
                  <div style={{fontWeight: 'bold', textAlign: 'right'}}>{quest.questionType === 'mcq' ? 'MCQ' : 'Coding'}</div>
                  <div style={{color: '#6b7280'}}>Total XP</div>
                  <div style={{fontWeight: 'bold', textAlign: 'right'}}>{quest.totalXP}</div>
                  <div style={{color: '#6b7280'}}>Levels</div>
                  <div style={{fontWeight: 'bold', textAlign: 'right'}}>{quest.levels?.length || 0}</div>
                </div>
              </div>
              <div className="quest-card-footer" style={{justifyContent: 'flex-start'}}>
                <button 
                  className="action-btn edit-btn" 
                  style={{flex: 1, marginRight: '0.5rem', background: '#2563eb', color: '#fff', borderRadius: '8px', fontWeight: 500, fontSize: '1rem', padding: '0.6rem 0'}} 
                  onClick={() => handleEditQuest(quest)}
                  title="Edit quest"
                >
                  <FaEdit style={{marginRight: '0.5rem'}} /> Edit
                </button>
                <button 
                  className="action-btn delete-btn" 
                  style={{flex: 0.4, background: '#ef4444', color: '#fff', borderRadius: '8px', fontWeight: 500, fontSize: '1rem', padding: '0.6rem 0'}} 
                  onClick={() => handleDeleteQuest(quest._id)}
                  title="Delete quest"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Quests;
