import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function HomeComponent({ socket }) {

    const navigate = useNavigate();
    
    useEffect(() => {
        if (socket && socket.connected) {
            socket.disconnect();
        }
    }, [socket]);
    
    let goTo = (path) => {
        navigate(path);
    }    

    return (
        <div className="container w-100 h-100 d-flex justify-content-center align-items-center flex-column">
            <p className='display-1'>DEKOU</p>
            <div className='py-5 w-50 border border-white border-5 rounded'>
                <p className="display-5 text-center hovering cursorPointer" onClick={() => goTo('/multiplayer')}>JOUER</p>
                <p className="display-5 text-center hovering cursorPointer" onClick={() => goTo('/settings')}>PARAMETRES</p>
                <p className="display-5 text-center hovering cursorPointer" onClick={() => goTo('/credits')}>CREDITS</p>
                <p className='display-5 text-center hovering cursorPointer'>QUITTER</p>
            </div>
        </div>
    );
}

export default HomeComponent;
