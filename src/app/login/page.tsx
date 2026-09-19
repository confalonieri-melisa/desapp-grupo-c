import FormInput from "@/components/FormInput";
import ActionButton from "@/components/ActionButton";
import styles from "./LoginPage.module.scss";

export default function LoginPage() {
  return (
    <div className={styles.bg}>
      <form className={styles.card}>
        <div className={styles['card-description']}>
          <h1 className={styles['card-title']}>
            ¡Bienvenida <span className={styles['card-title-span']}> de vuelta!</span>
          </h1>
          <p className={styles['card-text']}>
            Inicia sesion para continuar explorando el mercado de valoracion de jugadores.
          </p>
        </div>
        <div className={styles['form-inputs']}>
          <FormInput type="text" label="E-mail" />
          <FormInput type="password" label="Contraseña" />
        </div>
        <ActionButton />
        <p className={styles['action-text']}>
          ¿No tienes cuenta? <a className={styles['action-link']} href="/">Regístrate</a>
        </p>
      </form>
    </div>
  );
}
