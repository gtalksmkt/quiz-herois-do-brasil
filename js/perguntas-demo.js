/* ==================================================================
   PERGUNTAS DE DEMONSTRAÇÃO (usadas só quando config.endpoint está vazio)
   ⚠️ Este arquivo é público: não coloque aqui as perguntas oficiais nem o
   gabarito. As perguntas oficiais ficam na aba "Perguntas" da planilha, e o
   Apps Script só entrega cada rodada quando ela abre.
   Ordem: rodada 1 = dia 1 manhã, 2 = dia 1 tarde, 3 = dia 1 noite, 4 = dia 2 manhã...
   ================================================================== */
window.QUIZ_PERGUNTAS_DEMO = {
  1: [
    { p: 'Na sequência rápida de intubação, qual destes medicamentos é um bloqueador neuromuscular?', o: ['Rocurônio', 'Midazolam', 'Fentanil', 'Cetamina'] },
    { p: 'Qual dispositivo mostra a glote em uma tela, por meio de uma câmera na ponta da lâmina?', o: ['Laringoscópio convencional (Macintosh)', 'Videolaringoscópio', 'Máscara laríngea', 'Cânula de Guedel'] },
    { p: 'Qual é o método mais confiável para confirmar a posição do tubo na traqueia?', o: ['Ausculta pulmonar', 'Embaçamento do tubo', 'Capnografia com curva', 'Expansão do tórax'] }
  ],
  2: [
    { p: 'Na RCP de adultos, qual é a frequência recomendada de compressões torácicas?', o: ['60 a 80 por minuto', '80 a 100 por minuto', '100 a 120 por minuto', '120 a 140 por minuto'] },
    { p: 'Qual é a profundidade recomendada das compressões em adultos?', o: ['2 a 3 cm', '3 a 4 cm', '5 a 6 cm', '7 a 8 cm'] },
    { p: 'Qual destes ritmos de parada é chocável?', o: ['Assistolia', 'Atividade elétrica sem pulso', 'Fibrilação ventricular', 'Bradicardia sinusal'] }
  ],
  3: [
    { p: 'Na sepse com hipoperfusão, qual volume inicial de cristaloide é sugerido nas primeiras 3 horas?', o: ['10 mL/kg', '30 mL/kg', '50 mL/kg', '5 mL/kg'] },
    { p: 'Qual é o vasopressor de primeira escolha no choque séptico?', o: ['Dopamina', 'Noradrenalina', 'Adrenalina', 'Dobutamina'] },
    { p: 'Qual é a meta inicial de pressão arterial média no choque séptico?', o: ['55 mmHg ou mais', '65 mmHg ou mais', '80 mmHg ou mais', '90 mmHg ou mais'] }
  ],
  4: [
    { p: 'No atendimento ao trauma (XABCDE), o que significa o "X"?', o: ['Raio-X na sala de emergência', 'Controle de hemorragia exsanguinante', 'Exposição do paciente', 'Uso de xilocaína'] },
    { p: 'Qual é a menor pontuação possível na Escala de Coma de Glasgow?', o: ['0', '1', '3', '5'] },
    { p: 'Diante de pneumotórax hipertensivo, qual é a conduta imediata?', o: ['Tomografia de tórax', 'Descompressão do tórax', 'Radiografia de tórax', 'Aguardar e reavaliar'] }
  ],
  5: [
    { p: 'No infarto com supra de ST, qual é o tempo ideal porta-balão para a angioplastia primária?', o: ['Até 30 minutos', 'Até 90 minutos', 'Até 180 minutos', 'Até 12 horas'] },
    { p: 'Quando a opção é a fibrinólise, qual é o tempo porta-agulha recomendado?', o: ['Até 10 minutos', 'Até 30 minutos', 'Até 60 minutos', 'Até 120 minutos'] },
    { p: 'Taquicardia com pulso e sinais de instabilidade: qual é a conduta?', o: ['Adenosina', 'Cardioversão elétrica sincronizada', 'Desfibrilação não sincronizada', 'Amiodarona por via oral'] }
  ],
  6: [
    { p: 'No AVC isquêmico, até quantas horas do início dos sintomas é indicada a trombólise venosa com alteplase?', o: ['2 horas', '4,5 horas', '12 horas', '24 horas'] },
    { p: 'Qual é o primeiro exame de imagem no AVC agudo?', o: ['Ressonância com contraste', 'Tomografia de crânio sem contraste', 'Angiografia cerebral', 'Doppler de carótidas'] },
    { p: 'Crise convulsiva que dura mais de 5 minutos: qual é a primeira linha de tratamento?', o: ['Fenitoína', 'Benzodiazepínico (ex.: midazolam)', 'Ácido valproico', 'Fenobarbital'] }
  ],
  7: [
    { p: 'Na anafilaxia, qual é o primeiro medicamento a ser feito?', o: ['Anti-histamínico na veia', 'Corticoide na veia', 'Adrenalina intramuscular', 'Salbutamol inalatório'] },
    { p: 'Qual é a dose de adrenalina intramuscular para um adulto com anafilaxia?', o: ['0,05 mg', '0,5 mg', '5 mg', '1 mg na veia'] },
    { p: 'Qual é o antídoto da intoxicação por paracetamol?', o: ['Naloxona', 'Flumazenil', 'N-acetilcisteína', 'Atropina'] }
  ],
  8: [
    { p: 'Hipercalemia com alteração no ECG: o que se faz primeiro para proteger o coração?', o: ['Gluconato de cálcio', 'Furosemida', 'Bicarbonato de sódio', 'Insulina com glicose'] },
    { p: 'Na cetoacidose diabética, qual exame precisa ser conferido antes de iniciar a insulina?', o: ['Sódio', 'Potássio', 'Cálcio', 'Magnésio'] },
    { p: 'Hipoglicemia em paciente inconsciente e sem acesso venoso: qual é a opção?', o: ['Glicose por via oral', 'Glucagon intramuscular', 'Insulina regular', 'Tiamina por via oral'] }
  ],
  9: [
    { p: 'O protocolo FAST procura principalmente:', o: ['Fraturas', 'Líquido livre (sangue) no abdome, pericárdio e tórax', 'Lesão de medula', 'Pneumonia'] },
    { p: 'Ausência de deslizamento pleural no ultrassom sugere:', o: ['Derrame pleural', 'Pneumotórax', 'Pneumonia', 'Pulmão normal'] },
    { p: 'Várias linhas B nos dois pulmões sugerem:', o: ['Pneumotórax', 'Pulmão normal', 'Síndrome intersticial (ex.: edema pulmonar)', 'Derrame pericárdico'] }
  ]
};
