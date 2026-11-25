-- Códigos já identificados no histórico do Meta (nov/2026). Nome NULL = "A nomear".
INSERT INTO trafego_pago.evento_codigo (codigo, nome, cidade, data_evento, status) VALUES
 ('08CEO2026', 'Jornadas de leads', 'Online', NULL, 'ativo'),
 ('CCX', 'CCX · ingressos', NULL, NULL, 'encerrado'),
 ('17CEO2026', 'CCX 2026', NULL, NULL, 'encerrado'),
 ('06CEO2026', 'Porto Alegre', 'Porto Alegre', NULL, 'ativo'),
 ('07CEO2026', NULL, NULL, NULL, 'ativo'),
 ('03CEO2026', NULL, NULL, NULL, 'ativo'),
 ('01CEO2026', 'Seguidores e perfil', 'Online', NULL, 'ativo'),
 ('04CEO2026', 'Brasília', 'Brasília', NULL, 'ativo'),
 ('14CEO2026', NULL, NULL, NULL, 'ativo'),
 ('21CEO2026', NULL, NULL, NULL, 'ativo'),
 ('20CEO2026', 'Belo Horizonte', 'Belo Horizonte', NULL, 'ativo'),
 ('19CEO2026', NULL, NULL, NULL, 'ativo'),
 ('18CEO2026', 'Curitiba', 'Curitiba', NULL, 'ativo'),
 ('25CEO2026', 'Imersão de Vendas', 'Online', NULL, 'ativo'),
 ('02CEO2026', 'Campinas', 'Campinas', NULL, 'ativo'),
 ('CONTADORCEO', 'Perfil', 'Online', NULL, 'ativo'),
 ('30CEO2026', 'Alavanca Contábil', 'Uberlândia', '2026-11-12', 'encerrado')
ON CONFLICT (codigo) DO NOTHING;

-- Metas de exemplo: o Rogério define os valores reais.
INSERT INTO trafego_pago.meta_config (chave, valor) VALUES ('leads_dia', 110), ('custo_reuniao', 600)
ON CONFLICT (chave) DO NOTHING;
