-- Seed ~30 common Portuguese medications
-- leaflet_url points to INFARMED Infomed front-office search
-- In production, replace with actual AIM/CNPEM codes from Infomed sync

insert into drugs (name, active_substance, strength, form, route, atc_code, leaflet_url, is_marketed) values
  ('Brufen', 'Ibuprofeno', '400 mg', 'Comprimido revestido', 'Oral', 'M01AE01', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento?p_p_id=101&p_p_lifecycle=0&p_p_state=maximized&_101_struts_action=%2Fasset_publisher%2Fview_content&_101_assetEntryId=&_101_type=content&_101_urlTitle=infomed', true),
  ('Voltaren', 'Diclofenac', '50 mg', 'Comprimido gastrorresistente', 'Oral', 'M01AB05', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Panadol', 'Paracetamol', '500 mg', 'Comprimido', 'Oral', 'N02BE01', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Ben-u-ron', 'Paracetamol', '1000 mg', 'Comprimido', 'Oral', 'N02BE01', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Aspirina', 'Ácido acetilsalicílico', '500 mg', 'Comprimido', 'Oral', 'N02BA01', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Amoxicilina Generis', 'Amoxicilina', '500 mg', 'Cápsula', 'Oral', 'J01CA04', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Augmentin', 'Amoxicilina + Ácido clavulânico', '875 mg/125 mg', 'Comprimido revestido', 'Oral', 'J01CR02', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Clamoxyl', 'Amoxicilina', '250 mg/5 ml', 'Pó para suspensão oral', 'Oral', 'J01CA04', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Noroxin', 'Norfloxacina', '400 mg', 'Comprimido revestido', 'Oral', 'J01MA06', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Zithromax', 'Azitromicina', '500 mg', 'Comprimido revestido', 'Oral', 'J01FA10', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Omeprazol Generis', 'Omeprazol', '20 mg', 'Cápsula gastrorresistente', 'Oral', 'A02BC01', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Pantoprazol Generis', 'Pantoprazol', '40 mg', 'Comprimido gastrorresistente', 'Oral', 'A02BC02', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Nexium', 'Esomeprazol', '20 mg', 'Comprimido gastrorresistente', 'Oral', 'A02BC05', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Metformina Generis', 'Metformina', '500 mg', 'Comprimido revestido', 'Oral', 'A10BA02', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Glucophage', 'Metformina', '1000 mg', 'Comprimido revestido', 'Oral', 'A10BA02', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Atorvastatina Generis', 'Atorvastatina', '20 mg', 'Comprimido revestido', 'Oral', 'C10AA05', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Lipitor', 'Atorvastatina', '40 mg', 'Comprimido revestido', 'Oral', 'C10AA05', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Ramipril Generis', 'Ramipril', '5 mg', 'Cápsula', 'Oral', 'C09AA05', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Tritace', 'Ramipril', '10 mg', 'Cápsula', 'Oral', 'C09AA05', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Lisinopril Generis', 'Lisinopril', '10 mg', 'Comprimido', 'Oral', 'C09AA03', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Amlodipina Generis', 'Amlodipina', '5 mg', 'Comprimido', 'Oral', 'C08CA01', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Norvasc', 'Amlodipina', '10 mg', 'Comprimido', 'Oral', 'C08CA01', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Bisoprolol Generis', 'Bisoprolol', '5 mg', 'Comprimido revestido', 'Oral', 'C07AB07', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Concor', 'Bisoprolol', '10 mg', 'Comprimido revestido', 'Oral', 'C07AB07', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Sertraline Generis', 'Sertralina', '50 mg', 'Comprimido revestido', 'Oral', 'N06AB06', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Zoloft', 'Sertralina', '100 mg', 'Comprimido revestido', 'Oral', 'N06AB06', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Diazepam Generis', 'Diazepam', '5 mg', 'Comprimido', 'Oral', 'N05BA01', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Alprazolam Generis', 'Alprazolam', '0,25 mg', 'Comprimido', 'Oral', 'N05BA12', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Levotiroxina Generis', 'Levotiroxina sódica', '50 mcg', 'Comprimido', 'Oral', 'H03AA01', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Euthyrox', 'Levotiroxina sódica', '100 mcg', 'Comprimido', 'Oral', 'H03AA01', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Prednisolona Generis', 'Prednisolona', '5 mg', 'Comprimido', 'Oral', 'H02AB06', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Loratadina Generis', 'Loratadina', '10 mg', 'Comprimido', 'Oral', 'R06AX13', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true),
  ('Clarityn', 'Loratadina', '10 mg', 'Comprimido', 'Oral', 'R06AX13', 'https://www.infarmed.pt/web/infarmed/pesquisa-do-medicamento', true)
on conflict do nothing;
