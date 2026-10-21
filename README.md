# Órbita

Miniaplicativo web em português para cálculos e conversões, com interface responsiva. A versão para uso pessoal abre diretamente no navegador, sem instalar programas.

## Abrir com dois cliques — recomendado

1. No GitHub, escolha **Code → Download ZIP**.
2. Extraia o ZIP (**botão direito → Extrair Tudo**, no Windows).
3. Abra a pasta extraída e dê dois cliques em **`ABRIR_ORBITA.html`**.

Não precisa de Node.js, terminal nem `npm start`. Se o arquivo abrir como texto, escolha **Abrir com → Chrome, Edge ou Firefox**.

As calculadoras e o conversor de medidas funcionam sem internet. As cotações e a PTAX são consultadas diretamente nas fontes públicas e dependem de internet e de essas fontes permitirem acesso pelo navegador. Se a consulta falhar, o aplicativo informa a indisponibilidade; nenhum valor é inventado. A disponibilidade real das fontes não foi validada neste ambiente devido a bloqueio de rede.

## Executar o servidor — para desenvolvimento

Esta alternativa requer **Node.js 24.5 ou superior** e dispensa dependências de produção ou chave de API.

1. Instale o [Node.js 24 LTS](https://nodejs.org/pt), versão 24.5 ou superior.
2. No GitHub, escolha **Code → Download ZIP** e extraia o arquivo.
3. Abra um terminal na pasta extraída que contém `package.json`. No Windows, abra essa pasta no Explorador de Arquivos, digite `cmd` na barra de endereço e pressione Enter.
4. Execute:

```sh
npm start
```

5. No navegador do seu computador, acesse `http://localhost:3000`. Deixe o terminal aberto enquanto usa o aplicativo; pressione **Ctrl+C** para encerrar.

Não é necessário executar `npm install`. No ambiente de desenvolvimento na nuvem, o checkout fica em `/workspace/ia`.

O servidor usa a porta 3000; configure `PORT` para alterar. `npm run dev` reinicia o servidor quando arquivos mudam. Nesse modo, acesse a interface pelo servidor HTTP. O arquivo `public/index.html` depende desse servidor; apenas `ABRIR_ORBITA.html` é preparado para abrir diretamente.

## Recursos

- Calculadora normal, expressões com precedência, teclado, cópia e histórico local de até 25 operações.
- Científica com graus/radianos, trigonometria, logaritmos, raízes, potências, constantes e fatorial. O parser não executa JavaScript. `x%` significa `x/100`.
- Juros compostos com aportes ao fim do mês, juros simples e financiamento Price. Taxa mensal e prazo em meses; resultados brutos sem impostos ou tarifas.
- Dólar, euro e libra em reais via AwesomeAPI, consultados a cada 60 segundos enquanto a página está visível. Exibe data e hora informadas pela fonte. Não é um feed tick a tick.
- PTAX oficial de compra ou venda do Banco Central, exclusivamente do boletim **Fechamento**. O painel mostra o fechamento mais recente nos últimos dez dias; o conversor exige a data selecionada, sem substituição automática. Conversões cruzadas usam a mesma modalidade de PTAX nas duas moedas. A PTAX é referência e não uma oferta de câmbio.
- Comprimento, massa, temperatura, área, volume, velocidade, tempo e dados, incluindo unidades decimais e binárias.

## Fontes e rede

O servidor consulta HTTPS em `economia.awesomeapi.com.br` e `olinda.bcb.gov.br`. Essas saídas precisam estar permitidas no ambiente. Erros são mostrados sem inventar cotações. A API do mercado é armazenada em memória por 60 segundos; PTAX por cinco minutos. Finais de semana, feriados ou dias anteriores à publicação do fechamento podem não ter PTAX disponível. Nenhuma credencial é necessária para os endpoints públicos utilizados.

Os cálculos usam precisão numérica de ponto flutuante; valores monetários são formatados com duas casas e cotações com quatro. O histórico fica somente no navegador e pode ser apagado pelo botão Limpar. Requisições de cotação não incluem os valores que o usuário quer converter.

## Validar

```sh
npm run check
npm test
npm run build:standalone
```

Após alterar arquivos em `public/`, execute `npm run build:standalone` para atualizar a versão que abre com dois cliques. O arquivo gerado não precisa de Node.js no computador do usuário.

Os testes cobrem cálculos, domínios inválidos, fórmulas financeiras, unidades, conversão cruzada e rotas HTTP. Testes dos contratos das fontes usam respostas simuladas explicitamente; a disponibilidade real das APIs depende de rede e provedor.

## Estrutura

- `server.js`: arquivos estáticos e consulta às fontes públicas, sem segredos no cliente.
- `public/math.js`: operações e fórmulas testáveis.
- `public/rates.js`: acesso às fontes, compartilhado pelo servidor e pela versão independente.
- `public/app.js`: interface, histórico e consultas.
- `public/index.html` e `public/style.css`: layout e apresentação.
- `ABRIR_ORBITA.html`: versão independente para abrir diretamente no navegador.
- `scripts/build-standalone.js`: geração da versão independente sem dependências.

Cada tarefa na nuvem já é isolada. Use o checkout existente, sem criar um Git worktree, salvo solicitação explícita.
