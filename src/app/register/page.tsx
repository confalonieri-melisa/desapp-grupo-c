import Card, { CardTitle, CardTitleSpan, CardText, CardInputs, CardFooter } from "@/components/Card";
import FormInput from "@/components/FormInput";
import ActionButton from "@/components/ActionButton";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <Card>
      <div>
        <CardTitle>
          ¡Crea tu <CardTitleSpan>cuenta!</CardTitleSpan>
        </CardTitle>
        <CardText>
          Regístrate para comenzar a explorar el mercado de valoración de jugadores.
        </CardText>
      </div>

      <CardInputs>
        <FormInput type="text" label="Nombre completo" />
        <FormInput type="email" label="Correo electrónico" />
        <FormInput type="password" label="Contraseña" />
      </CardInputs>

      <ActionButton text="Registrarse" />

      <CardFooter>
        ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
      </CardFooter>
    </Card>
  );
}
