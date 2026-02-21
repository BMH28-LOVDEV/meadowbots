
-- Drop the unique constraint on scout_name to allow multiple teams per scout
ALTER TABLE public.team_assignments DROP CONSTRAINT IF EXISTS team_assignments_scout_name_key;

-- Clear existing assignments
DELETE FROM public.team_assignments;

-- Insert new assignments: 3 teams per scout, 3 qual matches each
INSERT INTO public.team_assignments (scout_name, team_number, team_name, qual_matches) VALUES
('Alex Gianelloni', '22774', '', ARRAY['Q1','Q11','Q19']),
('Alex Gianelloni', '18419', '', ARRAY['Q2','Q18','Q24']),
('Alex Gianelloni', '20681', '', ARRAY['Q8','Q17','Q28']),
('Chantelle Wong', '19808', '', ARRAY['Q1','Q13','Q24']),
('Chantelle Wong', '31733', '', ARRAY['Q7','Q19','Q29']),
('Chantelle Wong', '23667', '', ARRAY['Q10','Q23','Q32']),
('Clara Tsang', '25913', '', ARRAY['Q1','Q15','Q21']),
('Clara Tsang', '17506', '', ARRAY['Q10','Q22','Q25']),
('Clara Tsang', '15884', '', ARRAY['Q6','Q20','Q39']),
('Gabriel Efendi', '16158', '', ARRAY['Q2','Q17','Q26']),
('Gabriel Efendi', '18858', '', ARRAY['Q12','Q22','Q33']),
('Gabriel Efendi', '15889', '', ARRAY['Q9','Q24','Q36']),
('Heath Wells', '19810', '', ARRAY['Q3','Q23','Q34']),
('Heath Wells', '26019', '', ARRAY['Q8','Q25','Q40']),
('Heath Wells', '30408', '', ARRAY['Q14','Q27','Q38']),
('Jaden Gilmore', '12777', '', ARRAY['Q11','Q20','Q29']),
('Jaden Gilmore', '12991', '', ARRAY['Q4','Q17','Q32']),
('Jaden Gilmore', '21707', '', ARRAY['Q7','Q22','Q40']),
('Jason Xie', '21535', '', ARRAY['Q4','Q14','Q26']),
('Jason Xie', '3050', '', ARRAY['Q11','Q19','Q35']),
('Jason Xie', '27105', '', ARRAY['Q10','Q30','Q41']),
('Jude Trujillo', '23655', '', ARRAY['Q5','Q14','Q33']),
('Jude Trujillo', '22774', '', ARRAY['Q28','Q38','Q48']),
('Jude Trujillo', '19808', '', ARRAY['Q31','Q39','Q43']),
('Julian Chaudhry', '25913', '', ARRAY['Q26','Q36','Q44']),
('Julian Chaudhry', '18419', '', ARRAY['Q30','Q35','Q45']),
('Julian Chaudhry', '31733', '', ARRAY['Q34','Q42','Q15']),
('Kayleb Hauge', '17506', '', ARRAY['Q33','Q38','Q43']),
('Kayleb Hauge', '16158', '', ARRAY['Q9','Q31','Q46']),
('Kayleb Hauge', '18858', '', ARRAY['Q3','Q27','Q42']),
('Lucas Zhang', '19810', '', ARRAY['Q16','Q37','Q47']),
('Lucas Zhang', '26019', '', ARRAY['Q13','Q32','Q46']),
('Lucas Zhang', '12777', '', ARRAY['Q3','Q36','Q43']),
('Michael Xie', '12991', '', ARRAY['Q24','Q38','Q47']),
('Michael Xie', '21707', '', ARRAY['Q13','Q28','Q44']),
('Michael Xie', '21535', '', ARRAY['Q8','Q31','Q37']),
('Zoe GK', '3050', '', ARRAY['Q16','Q27','Q46']),
('Zoe GK', '27105', '', ARRAY['Q5','Q36','Q48']),
('Zoe GK', '23655', '', ARRAY['Q19','Q39','Q44']);
