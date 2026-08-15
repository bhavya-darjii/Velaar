/* eslint-disable */
// @ts-nocheck
import './RiskScoreCard.css';

const riskLevel = (score) => {
  if (score >= 70) return { label: 'High Risk', className: 'risk-score--high' };
  if (score >= 40) return { label: 'Moderate', className: 'risk-score--moderate' };
  return { label: 'Low Risk', className: 'risk-score--low' };
};

const RiskScoreCard = ({ studentName, score = 0, suggestion = '', onClick }) => {
  const level = riskLevel(score);

  return (
    <div className={`risk-score-card glass-card ${level.className}`} onClick={onClick} role={onClick ? 'button' : undefined}>
      <div className="risk-score-card__header">
        <span className="risk-score-card__name">{studentName}</span>
        <span className={`risk-score-card__badge ${level.className}`}>{level.label}</span>
      </div>
      <div className="risk-score-card__score">
        <span className="risk-score-card__value">{score}</span>
        <span className="risk-score-card__max">/100</span>
      </div>
      {suggestion && <p className="risk-score-card__suggestion">{suggestion}</p>}
    </div>
  );
};

export default RiskScoreCard;

