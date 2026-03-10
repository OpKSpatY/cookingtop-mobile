export interface IngredientInfo {
  nome: string;
  imagem: any;
}

const imgOvos = require('../assets/ingredients/ovos.jpg');
const imgFarinha = require('../assets/ingredients/farinha.jpg');
const imgLeite = require('../assets/ingredients/leite.jpg');
const imgArroz = require('../assets/ingredients/arroz.jpg');
const imgFeijao = require('../assets/ingredients/feijao.jpg');
const imgCebola = require('../assets/ingredients/cebola.jpg');
const imgAlho = require('../assets/ingredients/alho.jpg');
const imgAzeite = require('../assets/ingredients/azeite.jpg');

export const ingredientDatabase: IngredientInfo[] = [
  { nome: 'Ovos', imagem: imgOvos },
  { nome: 'Farinha de trigo', imagem: imgFarinha },
  { nome: 'Leite', imagem: imgLeite },
  { nome: 'Arroz', imagem: imgArroz },
  { nome: 'Feijão preto', imagem: imgFeijao },
  { nome: 'Cebola', imagem: imgCebola },
  { nome: 'Alho', imagem: imgAlho },
  { nome: 'Azeite', imagem: imgAzeite },
  { nome: 'Manteiga', imagem: imgLeite },
  { nome: 'Açúcar', imagem: imgFarinha },
  { nome: 'Sal', imagem: imgFarinha },
  { nome: 'Pimenta', imagem: imgCebola },
  { nome: 'Tomate', imagem: imgCebola },
  { nome: 'Batata', imagem: imgCebola },
  { nome: 'Cenoura', imagem: imgCebola },
  { nome: 'Frango', imagem: imgOvos },
  { nome: 'Carne bovina', imagem: imgFeijao },
  { nome: 'Queijo', imagem: imgLeite },
  { nome: 'Creme de leite', imagem: imgLeite },
  { nome: 'Molho de tomate', imagem: imgCebola },
  { nome: 'Macarrão', imagem: imgFarinha },
  { nome: 'Banana', imagem: imgCebola },
  { nome: 'Limão', imagem: imgCebola },
  { nome: 'Chocolate em pó', imagem: imgFeijao },
  { nome: 'Polvilho azedo', imagem: imgFarinha },
  { nome: 'Salmão', imagem: imgOvos },
  { nome: 'Abacate', imagem: imgCebola },
  { nome: 'Granola', imagem: imgArroz },
  { nome: 'Mel', imagem: imgAzeite },
];

export function getIngredientImage(nome: string): any {
  const found = ingredientDatabase.find(
    (i) => i.nome.toLowerCase() === nome.toLowerCase()
  );
  return found?.imagem ?? imgFarinha;
}
