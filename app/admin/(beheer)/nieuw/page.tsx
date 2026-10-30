import { requireAdmin } from "@/lib/admin";
import { DemoForm } from "../../demo-form";

export default async function NewDemo() {
  await requireAdmin();
  return (
    <main>
      <h1>Nieuwe demo</h1>
      <div className="panel">
        <DemoForm />
      </div>
    </main>
  );
}
