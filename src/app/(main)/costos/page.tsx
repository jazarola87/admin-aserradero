
import { redirect } from 'next/navigation';

export default function DeprecatedCostosPage() {
  redirect('/costos-operativos');
  return null;
}
