import React from 'react';
import QuestCard from './QuestCard';

const QuestSection = ({ title, quests, progress }) => {
  return (
    <div className="quest-section">
      <h2 className="section-title">{title}</h2>
      <div className="quest-grid">
        {quests.map((quest) => (
          <QuestCard
            key={quest._id}
            topic={quest}
            progress={progress.find(p => p.topicId === quest._id)}
          />
        ))}
      </div>
    </div>
  );
};

export default QuestSection;
