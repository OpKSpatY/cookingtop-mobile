import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, FileText, Shield, Info, ChevronDown } from 'lucide-react-native';
import { colors } from '../theme/colors';

interface SettingsScreenProps {
  onBack: () => void;
}

const APP_VERSION = '1.0.0';

const LegalSection = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.legalItem}>
      <TouchableOpacity style={styles.legalHeader} onPress={() => setOpen(!open)}>
        <Text style={styles.legalTitle}>{title}</Text>
        <ChevronDown
          size={14}
          color={colors.mutedForeground}
          style={open ? { transform: [{ rotate: '180deg' }] } : undefined}
        />
      </TouchableOpacity>
      {open && <View style={styles.legalBody}>{children}</View>}
    </View>
  );
};

const BulletItem = ({ children }: { children: string }) => (
  <View style={styles.bulletRow}>
    <Text style={styles.bullet}>•</Text>
    <Text style={styles.bulletText}>{children}</Text>
  </View>
);

const SettingsScreen = ({ onBack }: SettingsScreenProps) => {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.primary }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: colors.background }}>
        <View style={styles.headerBg}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Configurações</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Info size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Sobre o App</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Aplicativo</Text>
            <Text style={styles.infoValue}>CookingTop</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Versão</Text>
            <Text style={styles.infoValue}>{APP_VERSION}</Text>
          </View>
          <Text style={styles.aboutText}>
            CookingTop é um aplicativo de receitas que conecta amantes da culinária, facilitando o compartilhamento e a descoberta de novas receitas.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <FileText size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Informações Legais</Text>
          </View>

          <LegalSection title="Termos de Uso">
            <Text style={styles.legalText}>
              Ao utilizar o CookingTop, você concorda com os seguintes termos:
            </Text>
            <BulletItem>O conteúdo publicado (receitas, fotos, comentários) é de responsabilidade do usuário.</BulletItem>
            <BulletItem>É proibido publicar conteúdo ofensivo, ilegal ou que viole direitos de terceiros.</BulletItem>
            <BulletItem>O CookingTop se reserva o direito de remover conteúdo que viole estas diretrizes.</BulletItem>
            <BulletItem>O uso do aplicativo é gratuito, podendo haver funcionalidades premium no futuro.</BulletItem>
          </LegalSection>

          <LegalSection title="Política de Privacidade">
            <Text style={styles.legalText}>
              Levamos sua privacidade a sério. Veja como tratamos seus dados:
            </Text>
            <BulletItem>Dados coletados: nome, email, foto de perfil e receitas publicadas.</BulletItem>
            <BulletItem>Finalidade: personalização da experiência e funcionamento do app.</BulletItem>
            <BulletItem>Compartilhamento: não vendemos nem compartilhamos seus dados com terceiros.</BulletItem>
            <BulletItem>Armazenamento: seus dados são armazenados de forma segura em servidores protegidos.</BulletItem>
          </LegalSection>

          <LegalSection title="Licenças e Créditos">
            <BulletItem>Ícones por Lucide Icons (ISC License).</BulletItem>
            <BulletItem>Avatares gerados por IA, livres de direitos autorais.</BulletItem>
            <BulletItem>Imagens de receitas para fins ilustrativos.</BulletItem>
            <BulletItem>Fontes: Playfair Display e Nunito (Google Fonts, Open Font License).</BulletItem>
          </LegalSection>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Shield size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Privacidade e Dados</Text>
          </View>
          <Text style={styles.legalText}>
            De acordo com a LGPD (Lei Geral de Proteção de Dados), você tem direito a:
          </Text>
          <BulletItem>Acessar seus dados pessoais armazenados.</BulletItem>
          <BulletItem>Solicitar correção de dados incorretos.</BulletItem>
          <BulletItem>Solicitar a exclusão dos seus dados.</BulletItem>
          <BulletItem>Revogar seu consentimento a qualquer momento.</BulletItem>
          <Text style={[styles.legalText, { marginTop: 8 }]}>
            Para exercer seus direitos, entre em contato pelo email: contato@cookingtop.app
          </Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBg: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingBottom: 24, paddingTop: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { marginTop: 8, fontSize: 18, fontWeight: '700', color: '#fff' },
  card: {
    marginHorizontal: 16, marginTop: 16, borderRadius: 16,
    backgroundColor: colors.card, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { fontSize: 14, color: colors.mutedForeground },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  aboutText: { fontSize: 12, color: colors.mutedForeground, marginTop: 8, lineHeight: 18 },
  legalItem: { borderBottomWidth: 1, borderBottomColor: colors.border },
  legalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  legalTitle: { fontSize: 14, fontWeight: '500', color: colors.foreground },
  legalBody: { paddingBottom: 12 },
  legalText: { fontSize: 12, color: colors.mutedForeground, lineHeight: 18 },
  bulletRow: { flexDirection: 'row', paddingLeft: 8, marginTop: 4 },
  bullet: { fontSize: 12, color: colors.mutedForeground, marginRight: 8 },
  bulletText: { fontSize: 12, color: colors.mutedForeground, flex: 1, lineHeight: 18 },
});

export default SettingsScreen;
