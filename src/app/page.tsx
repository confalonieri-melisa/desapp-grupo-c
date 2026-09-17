import {ArrowRight} from "lucide-react";

export default function Home() {
  return (
    <div className="bg">
      <form className="card">
        <div className="card-description"><h1 className="card-title">¡Bienvenida{" "}<span className="card-title-span"> de vuelta!</span></h1>
          <p className="card-text">Inicia sesion para continuar explorando el mercado de valoracion de jugadores.</p>
        </div><div className="form-inputs">
          <div className="input-wrapper">
            <input type='text' id='input' required></input>
            <label
                className='placeholder'>
              Nombre de usuario
            </label>
          </div>
          <div className="input-wrapper">
            <input type='password' id='password' required></input>
            <label
                className='placeholder'>
              Contraseña
            </label>
          </div>
        </div>
        <button type="submit" className="login-btn">Iniciar sesión <ArrowRight /> </button>
        <p className="action-text">¿No tienes cuenta? <a className="action-link" href="/">Regístrate</a></p>
      </form>
    </div>
  );
}
