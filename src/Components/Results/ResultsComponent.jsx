import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useParams } from "react-router-dom";

function ResultsComponent({ socket }) {

    const navigate = useNavigate();
    const location = useLocation();
    const { roomId } = useParams();
    
    let goTo = (path) => {
        navigate(path);
    }

    // Données passées depuis GameScenePage: scores, winnerIds, statsByPlayer, isWinner
    const { scores, winnerIds, statsByPlayer, isWinner, players } = location.state || {};

    if (!location.state) {
        // Par exemple, retourner à l'accueil ou afficher un message
        return (
        <div>
            <p>Aucune donnée de partie trouvée.</p>
            <button onClick={() => navigate("/")}>Retour à l'accueil</button>
        </div>
        );
    }

    return (
        <div className="container w-100 min-vh-100 d-flex justify-content-center align-items-center flex-column">
            <div className='py-5 px-3 w-50 border border-white border-5 rounded'>
                <h2 className="text-center display-6 mb-4">Résultats</h2>
                <div className="text-center mb-3 text-muted">
                    {isWinner ? <span className="">Bravo, vous avez gagné !</span> : <span className="">Partie terminée</span>}
                </div>
                <h4 className="mt-3">Scores</h4>
                <ul className="list-group mb-5">
                    {scores && Object.entries(scores).sort((a,b)=>b[1]-a[1]).map(([pid, score]) => (
                        <li key={pid} className="list-group-item d-flex justify-content-between">
                            <span>{pid === socket.id ? 'Vous' : ((players||[]).find(p=>p.id===pid)?.nickname || pid.slice(0,6))}</span>
                            <strong>{score}</strong>
                        </li>
                    ))}
                </ul>
                <div className="text-center">
                    <p className="display-6 text-center hovering cursorPointer" onClick={() => goTo('/')}>Accueil</p>
                </div>
            </div>
        </div>
    );
}

export default ResultsComponent;
