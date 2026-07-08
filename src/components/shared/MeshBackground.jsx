import './MeshBackground.css';
import backgroundImage from '../../assets/background-image.png';

const MeshBackground = () => (
  <div className="mesh-background" aria-hidden="true">
    <img src={backgroundImage} alt="" className="mesh-background-image" />
  </div>
);

export default MeshBackground;
