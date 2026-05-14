import Sidebar from '../Sidebar';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />
      <div className={styles.content}>
        {children}
      </div>
    </>
  );
}
