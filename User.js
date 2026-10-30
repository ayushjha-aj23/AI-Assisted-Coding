import './User.css';


function User({ name, avatarUrl }) {
    return (
        <div className="user-profile">
            <img src={avatarUrl} alt={`${name}'s avatar`} className="user-avatar" />
            <div className="user-profile-name" data-testid="user-card-name">{name}</div>
        </div>
    );
}

