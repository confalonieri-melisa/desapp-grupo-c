export default function Home() {
  return (
    <div className="bg">
      <form className="card">
        <h1>LOGIN</h1>
        <div className="form-inputs">
          <div className="input-wrapper">
            <input type='text' id='input' required></input>
            <label
                className='placeholder'>
              Username
            </label>
          </div>
          <div className="input-wrapper">
            <input type='password' id='password' required></input>
            <label
                className='placeholder'>
              Password
            </label>
          </div>
        </div>
        <button type="submit">Login</button>
        <p>No tienes cuenta? <a href="/">Regístrate</a></p>
      </form>
    </div>
  );
}
