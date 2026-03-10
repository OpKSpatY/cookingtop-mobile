# CookingTop Mobile

Aplicativo mobile de receitas desenvolvido com **React Native** e **Expo**, onde você pode explorar receitas da comunidade, gerenciar sua despensa, criar suas próprias receitas e descobrir o que cozinhar com os ingredientes que tem em casa.

## Funcionalidades

- **Dashboard** — Busca por nome, ingrediente, categoria ou autor, com carrosséis de receitas mais procuradas, melhor avaliadas e rápidas.
- **Descubra** — Filtre receitas por categoria e veja quais você pode fazer com os ingredientes da sua despensa.
- **Minhas Receitas** — Crie até 10 receitas próprias (com visibilidade pública/privada) e gerencie seus favoritos.
- **Despensa** — Controle seus ingredientes disponíveis e mantenha uma lista de compras organizada.

## Tecnologias

- [React Native](https://reactnative.dev/) 0.81
- [Expo](https://expo.dev/) SDK 54
- [React Navigation](https://reactnavigation.org/) (Bottom Tabs)
- [Lucide React Native](https://lucide.dev/) (ícones)
- TypeScript

## Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [Android Studio](https://developer.android.com/studio) com Android SDK instalado
- **JDK 17** (incluído no Android Studio)
- Variáveis de ambiente configuradas (ver seção abaixo)

### Configuração de variáveis de ambiente (Windows)

1. Abra **"Editar variáveis de ambiente do sistema"** no menu Iniciar.
2. Em **Variáveis do sistema**, crie:

| Variável | Valor |
|----------|-------|
| `JAVA_HOME` | `C:\Program Files\Android\Android Studio\jbr` |
| `ANDROID_HOME` | `C:\Users\<seu-usuario>\AppData\Local\Android\Sdk` |

3. Adicione ao `Path`:
   - `%JAVA_HOME%\bin`
   - `%ANDROID_HOME%\platform-tools`

4. Reinicie o terminal para aplicar as alterações.

## Instalação

```bash
git clone https://github.com/seu-usuario/cookingtop-mobile.git
cd cookingtop-mobile
npm install
```

## Executando o projeto

### Opção 1 — Expo Go (mais rápido, sem build nativo)

```bash
npm run start
```

No terminal, pressione `s` para alternar para o modo **Expo Go**. Escaneie o QR code com o app [Expo Go](https://expo.dev/go) no celular.

> O celular e o computador devem estar na mesma rede Wi-Fi.

### Opção 2 — Development Build (Android, via USB)

1. Ative o **modo desenvolvedor** no celular (toque 7x em "Número da versão").
2. Ative a **Depuração USB** nas opções de desenvolvedor.
3. Conecte o celular via cabo USB e autorize a depuração.
4. Verifique a conexão:

```bash
adb devices
```

5. Rode o build:

```bash
npm run android
```

A primeira compilação pode levar alguns minutos. Nas próximas vezes, basta rodar `npm run start`.

### Opção 3 — Web

```bash
npm run web
```

## Estrutura do projeto

```
src/
├── assets/            # Imagens (receitas, ingredientes, avatares, logo)
├── components/        # Componentes reutilizáveis (RecipeCard, StarRating, etc.)
├── contexts/          # Contextos React (Favoritos, Receitas do usuário)
├── data/              # Dados mock e mapeamento de imagens
├── navigation/        # Configuração de navegação (Bottom Tabs)
├── screens/           # Telas do app
│   ├── DashboardScreen.tsx
│   ├── DiscoverScreen.tsx
│   ├── MyRecipesScreen.tsx
│   └── PantryScreen.tsx
└── theme/             # Cores e tema do app
```

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run start` | Inicia o Metro Bundler |
| `npm run android` | Compila e executa no Android |
| `npm run ios` | Compila e executa no iOS |
| `npm run web` | Inicia a versão web |
