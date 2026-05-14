import Sidebar from '../Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />
      <div style={{ marginLeft: '16rem', paddingTop: '5rem', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </>
  );
}
