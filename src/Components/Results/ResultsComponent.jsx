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

    // Si aucune donnée n’est passée, on peut rediriger ou afficher un message d’erreur
    const { gameState, isWinner } = location.state || {};

    if (!location.state) {
        // Par exemple, retourner à l’accueil ou afficher un message
        return (
        <div>
            <p>Aucune donnée de partie trouvée.</p>
            <button onClick={() => navigate("/")}>Retour à l'accueil</button>
        </div>
        );
    }

    return (
        <div className="container w-100 h-100 d-flex justify-content-center align-items-center flex-column">
            <div className='py-5 w-50 border border-white border-5 rounded'>
                
                <p className="display-5 text-center hovering cursorPointer" onClick={() => goTo('/')}>Go home</p>
            </div>
        </div>    
    );
}

export default ResultsComponent;
