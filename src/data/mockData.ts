export interface Recipe {
  id: string;
  nome: string;
  imagem: any;
  rating: number;
  totalRatings: number;
  tempoPreparo: string;
  categoria: string;
  autor: string;
  ingredientes: { nome: string; quantidade: string }[];
  modoPreparo: string[];
  porcoes: number;
  observacoes?: string;
  publica?: boolean;
  isOwn?: boolean;
}

export interface PantryItem {
  id: string;
  nome: string;
  quantidade: string;
  categoria: string;
}

export const mockRecipes: Recipe[] = [
  {
    id: '1',
    nome: 'Strogonoff de Frango',
    imagem: require('../assets/recipe-strogonoff.jpg'),
    rating: 4.7,
    totalRatings: 234,
    tempoPreparo: '35 min',
    categoria: 'Pratos Principais',
    autor: 'Chef Maria',
    porcoes: 4,
    ingredientes: [
      { nome: 'Peito de frango', quantidade: '500g' },
      { nome: 'Creme de leite', quantidade: '200ml' },
      { nome: 'Molho de tomate', quantidade: '300ml' },
      { nome: 'Champignon', quantidade: '200g' },
      { nome: 'Cebola', quantidade: '1 unidade' },
    ],
    modoPreparo: [
      'Corte o frango em cubos e tempere com sal e pimenta.',
      'Refogue a cebola e adicione o frango.',
      'Adicione o molho de tomate e o champignon.',
      'Cozinhe por 15 minutos e adicione o creme de leite.',
      'Sirva com arroz branco e batata palha.',
    ],
  },
  {
    id: '2',
    nome: 'Feijoada Tradicional',
    imagem: require('../assets/recipe-feijoada.jpg'),
    rating: 4.9,
    totalRatings: 512,
    tempoPreparo: '2h 30min',
    categoria: 'Pratos Principais',
    autor: 'Chef João',
    porcoes: 8,
    ingredientes: [
      { nome: 'Feijão preto', quantidade: '500g' },
      { nome: 'Costela de porco', quantidade: '300g' },
      { nome: 'Linguiça calabresa', quantidade: '200g' },
      { nome: 'Bacon', quantidade: '150g' },
      { nome: 'Louro', quantidade: '2 folhas' },
    ],
    modoPreparo: [
      'Deixe o feijão de molho por 8 horas.',
      'Cozinhe as carnes separadamente.',
      'Adicione as carnes ao feijão e cozinhe por 2 horas.',
      'Tempere com alho, cebola e louro.',
      'Sirva com arroz, couve, farofa e laranja.',
    ],
  },
  {
    id: '3',
    nome: 'Açaí Bowl',
    imagem: require('../assets/recipe-acai.jpg'),
    rating: 4.5,
    totalRatings: 189,
    tempoPreparo: '10 min',
    categoria: 'Lanches',
    autor: 'Nutricionista Ana',
    porcoes: 1,
    ingredientes: [
      { nome: 'Polpa de açaí', quantidade: '200g' },
      { nome: 'Banana', quantidade: '1 unidade' },
      { nome: 'Granola', quantidade: '50g' },
      { nome: 'Mel', quantidade: '1 colher' },
      { nome: 'Morango', quantidade: '5 unidades' },
    ],
    modoPreparo: [
      'Bata a polpa de açaí com a banana no liquidificador.',
      'Despeje em uma tigela.',
      'Adicione granola, morango e mel por cima.',
      'Sirva gelado.',
    ],
  },
  {
    id: '4',
    nome: 'Bolo de Chocolate',
    imagem: require('../assets/recipe-bolo.jpg'),
    rating: 4.8,
    totalRatings: 876,
    tempoPreparo: '50 min',
    categoria: 'Sobremesas',
    autor: 'Chef Maria',
    porcoes: 12,
    ingredientes: [
      { nome: 'Farinha de trigo', quantidade: '2 xícaras' },
      { nome: 'Chocolate em pó', quantidade: '1 xícara' },
      { nome: 'Ovos', quantidade: '3 unidades' },
      { nome: 'Leite', quantidade: '1 xícara' },
      { nome: 'Açúcar', quantidade: '2 xícaras' },
    ],
    modoPreparo: [
      'Misture os ingredientes secos.',
      'Adicione os ovos, o leite e o óleo.',
      'Bata até ficar homogêneo.',
      'Asse a 180°C por 35 minutos.',
      'Cubra com ganache de chocolate.',
    ],
  },
  {
    id: '5',
    nome: 'Poke Bowl de Salmão',
    imagem: require('../assets/recipe-poke.jpg'),
    rating: 4.6,
    totalRatings: 145,
    tempoPreparo: '20 min',
    categoria: 'Pratos Principais',
    autor: 'Chef Kenji',
    porcoes: 2,
    ingredientes: [
      { nome: 'Salmão fresco', quantidade: '200g' },
      { nome: 'Arroz japonês', quantidade: '1 xícara' },
      { nome: 'Abacate', quantidade: '1 unidade' },
      { nome: 'Edamame', quantidade: '100g' },
      { nome: 'Molho shoyu', quantidade: '2 colheres' },
    ],
    modoPreparo: [
      'Cozinhe o arroz japonês e reserve.',
      'Corte o salmão em cubos.',
      'Monte a bowl com arroz, salmão, abacate e edamame.',
      'Regue com shoyu e gergelim.',
    ],
  },
  {
    id: '6',
    nome: 'Pão de Queijo',
    imagem: require('../assets/recipe-paodequeijo.jpg'),
    rating: 4.9,
    totalRatings: 1023,
    tempoPreparo: '30 min',
    categoria: 'Lanches',
    autor: 'Vó Conceição',
    porcoes: 20,
    ingredientes: [
      { nome: 'Polvilho azedo', quantidade: '500g' },
      { nome: 'Queijo minas', quantidade: '200g' },
      { nome: 'Ovos', quantidade: '2 unidades' },
      { nome: 'Leite', quantidade: '1 xícara' },
      { nome: 'Óleo', quantidade: '1/2 xícara' },
    ],
    modoPreparo: [
      'Ferva o leite com o óleo e sal.',
      'Despeje sobre o polvilho e misture bem.',
      'Adicione os ovos e o queijo ralado.',
      'Modele bolinhas e asse a 200°C por 20 minutos.',
    ],
  },
];

export const mockPantryItems: PantryItem[] = [
  { id: '1', nome: 'Ovos', quantidade: '6 unidades', categoria: 'Proteínas' },
  { id: '2', nome: 'Farinha de trigo', quantidade: '1 kg', categoria: 'Grãos' },
  { id: '3', nome: 'Leite', quantidade: '1 litro', categoria: 'Laticínios' },
  { id: '4', nome: 'Arroz', quantidade: '2 kg', categoria: 'Grãos' },
  { id: '5', nome: 'Feijão preto', quantidade: '500g', categoria: 'Grãos' },
  { id: '6', nome: 'Cebola', quantidade: '3 unidades', categoria: 'Vegetais' },
  { id: '7', nome: 'Alho', quantidade: '1 cabeça', categoria: 'Vegetais' },
  { id: '8', nome: 'Azeite', quantidade: '500ml', categoria: 'Óleos' },
];

export const ingredientOptions = [
  'Ovos', 'Farinha de trigo', 'Leite', 'Arroz', 'Feijão preto', 'Cebola', 'Alho',
  'Azeite', 'Manteiga', 'Açúcar', 'Sal', 'Pimenta', 'Tomate', 'Batata',
  'Cenoura', 'Frango', 'Carne bovina', 'Queijo', 'Creme de leite',
  'Molho de tomate', 'Macarrão', 'Banana', 'Limão', 'Chocolate em pó',
  'Polvilho azedo', 'Salmão', 'Abacate', 'Granola', 'Mel',
];
