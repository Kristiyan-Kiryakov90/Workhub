import { ProtectedScreen } from '@/components/protected-screen';
import { Badge, Button, Card, CardMeta, CardTitle, Row } from '@/components/ui';
import { useAuth, useLogoutAndReturnHome } from '@/lib/auth';
import { StyleSheet, View } from 'react-native';

export default function ProfileScreen() {
  const { session } = useAuth();
  const logout = useLogoutAndReturnHome();

  return (
    <ProtectedScreen title="Profile">
      <View style={styles.content}>
        <Card>
          <CardTitle>{session?.user.name ?? 'Profile'}</CardTitle>
          <CardMeta>{session?.user.email}</CardMeta>
          <View style={styles.roles}>
            {session?.roles.map((role) => (
              <Badge key={role.id} label={role.name} tone="blue" />
            ))}
          </View>
        </Card>
        <Card>
          <Row label="Organization" value={session?.organization.name} />
          <Row label="Organization Slug" value={session?.organization.slug} />
          <Row label="User ID" value={session?.user.id} />
        </Card>
        <Button label="Logout" onPress={logout} variant="danger" />
      </View>
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 9,
  },
  roles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
});
