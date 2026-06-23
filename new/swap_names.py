import csv

# Real species for the genera that were programmatically generated
real_species = {
    'Acacia': ['Acacia senegal', 'Acacia nilotica', 'Acacia dealbata', 'Acacia mearnsii', 'Acacia pycnantha', 'Acacia melanoxylon', 'Acacia saligna', 'Acacia confusa', 'Acacia tortilis', 'Acacia mangium', 'Acacia koa', 'Acacia farnesiana'],
    'Eucalyptus': ['Eucalyptus globulus', 'Eucalyptus camaldulensis', 'Eucalyptus marginata', 'Eucalyptus diversicolor', 'Eucalyptus saligna', 'Eucalyptus regnans', 'Eucalyptus grandis', 'Eucalyptus obliqua', 'Eucalyptus viminalis', 'Eucalyptus delegatensis', 'Eucalyptus citriodora', 'Eucalyptus robusta'],
    'Solanum': ['Solanum lycopersicum', 'Solanum tuberosum', 'Solanum melongena', 'Solanum nigrum', 'Solanum dulcamara', 'Solanum carolinense', 'Solanum pseudocapsicum', 'Solanum aviculare', 'Solanum mammosum', 'Solanum muricatum', 'Solanum quitoense', 'Solanum elaeagnifolium'],
    'Quercus': ['Quercus robur', 'Quercus alba', 'Quercus rubra', 'Quercus ilex', 'Quercus suber', 'Quercus cerris', 'Quercus coccinea', 'Quercus macrocarpa', 'Quercus petraea', 'Quercus palustris', 'Quercus virginiana', 'Quercus agrifolia'],
    'Pinus': ['Pinus sylvestris', 'Pinus nigra', 'Pinus strobus', 'Pinus ponderosa', 'Pinus radiata', 'Pinus taeda', 'Pinus contorta', 'Pinus halepensis', 'Pinus pinea', 'Pinus banksiana', 'Pinus resinosa', 'Pinus edulis'],
    'Canis': ['Canis lupus', 'Canis latrans', 'Canis aureus', 'Canis simensis', 'Canis anthus', 'Canis mesomelas', 'Canis adustus', 'Canis dirus', 'Canis rufus', 'Canis lycaon', 'Canis dingo', 'Canis familiaris'],
    'Felis': ['Felis catus', 'Felis silvestris', 'Felis chaus', 'Felis margarita', 'Felis nigripes', 'Felis bieti', 'Felis lybica', 'Felis manul', 'Felis rufus', 'Felis concolor', 'Felis pardalis', 'Felis serval'],
    'Panthera': ['Panthera leo', 'Panthera tigris', 'Panthera pardus', 'Panthera onca', 'Panthera uncia', 'Panthera spelaea', 'Panthera atrox', 'Panthera blytheae', 'Panthera zdanskyi', 'Panthera gombaszoegensis', 'Panthera youngi', 'Panthera palaeosinensis'],
    'Rana': ['Rana temporaria', 'Rana arvalis', 'Rana dalmatina', 'Rana sylvatica', 'Rana pipiens', 'Rana luteiventris', 'Rana draytonii', 'Rana cascadae', 'Rana aurora', 'Rana boylii', 'Rana pretiosa', 'Rana catesbeiana'],
    'Bufo': ['Bufo bufo', 'Bufo spinosus', 'Bufo japonicus', 'Bufo gargarizans', 'Bufo calamita', 'Bufo viridis', 'Bufo marinus', 'Bufo americanus', 'Bufo woodhousii', 'Bufo cognatus', 'Bufo boreas', 'Bufo alvarius'],
    'Apis': ['Apis mellifera', 'Apis cerana', 'Apis dorsata', 'Apis florea', 'Apis andreniformis', 'Apis koschevnikovi', 'Apis nigrocincta', 'Apis nuluensis', 'Apis binghami', 'Apis breviligula', 'Apis laboriosa', 'Apis nearctica'],
    'Papilio': ['Papilio machaon', 'Papilio polyxenes', 'Papilio rutulus', 'Papilio glaucus', 'Papilio troilus', 'Papilio cresphontes', 'Papilio zelicaon', 'Papilio canadensis', 'Papilio multicaudata', 'Papilio eurymedon', 'Papilio indra', 'Papilio bairdii'],
    'Crocodylus': ['Crocodylus niloticus', 'Crocodylus porosus', 'Crocodylus acutus', 'Crocodylus rhombifer', 'Crocodylus moreletii', 'Crocodylus intermedius', 'Crocodylus johnstoni', 'Crocodylus mindorensis', 'Crocodylus novaeguineae', 'Crocodylus palustris', 'Crocodylus siamensis', 'Crocodylus suchus'],
    'Varanus': ['Varanus komodoensis', 'Varanus salvator', 'Varanus niloticus', 'Varanus gouldii', 'Varanus exanthematicus', 'Varanus albigularis', 'Varanus bengalensis', 'Varanus panoptes', 'Varanus rosenbergi', 'Varanus priscus', 'Varanus varius', 'Varanus mertensi'],
    'Salmo': ['Salmo salar', 'Salmo trutta', 'Salmo marmoratus', 'Salmo obtusirostris', 'Salmo letnica', 'Salmo ohridanus', 'Salmo carpio', 'Salmo fibreni', 'Salmo pelagonicus', 'Salmo peristericus', 'Salmo platycephalus', 'Salmo trutta fario'],
    'Cyprinus': ['Cyprinus carpio', 'Cyprinus rubrofuscus', 'Cyprinus pellegrini', 'Cyprinus yilongensis', 'Cyprinus micristius', 'Cyprinus qionghaiensis', 'Cyprinus acutidorsalis', 'Cyprinus biondi', 'Cyprinus chilia', 'Cyprinus dai', 'Cyprinus daliensis', 'Cyprinus fuxianensis'],
    'Amanita': ['Amanita muscaria', 'Amanita phalloides', 'Amanita virosa', 'Amanita pantherina', 'Amanita rubescens', 'Amanita caesarea', 'Amanita verna', 'Amanita citrina', 'Amanita gemmata', 'Amanita porphyria', 'Amanita excelsa', 'Amanita vaginata'],
    'Rosa': ['Rosa canina', 'Rosa rubiginosa', 'Rosa rugosa', 'Rosa gallica', 'Rosa damascena', 'Rosa alba', 'Rosa centifolia', 'Rosa moschata', 'Rosa sempervirens', 'Rosa banksiae', 'Rosa laevigata', 'Rosa multiflora'],
    'Ficus': ['Ficus carica', 'Ficus benjamina', 'Ficus elastica', 'Ficus microcarpa', 'Ficus religiosa', 'Ficus benghalensis', 'Ficus sycomorus', 'Ficus racemosa', 'Ficus pumila', 'Ficus lyrata', 'Ficus macrophylla', 'Ficus rubiginosa'],
    'Acer': ['Acer saccharum', 'Acer rubrum', 'Acer platanoides', 'Acer pseudoplatanus', 'Acer palmatum', 'Acer campestre', 'Acer negundo', 'Acer saccharinum', 'Acer japonicum', 'Acer circinatum', 'Acer macrophyllum', 'Acer ginnala']
}

invalid_epithets = {'alba', 'rubra', 'maxima', 'minor', 'gigantea', 'orientalis', 'occidentalis', 'indica', 'africana', 'asiatica', 'marina', 'montana'}

with open('D:/dailytasks/Tasks/new/species.csv', 'r') as f:
    lines = f.read().splitlines()

new_lines = []
genus_counts = {k: 0 for k in real_species.keys()}

for line in lines:
    if line.strip() == '':
        continue
    if line == 'species_name':
        new_lines.append(line)
        continue
        
    parts = line.split()
    if len(parts) == 2:
        genus, epithet = parts
        if genus in real_species and epithet in invalid_epithets:
            # Swap with actual name
            idx = genus_counts[genus] % len(real_species[genus])
            new_lines.append(real_species[genus][idx])
            genus_counts[genus] += 1
            continue
            
    new_lines.append(line)

with open('D:/dailytasks/Tasks/new/species.csv', 'w', newline='') as f:
    for line in new_lines:
        f.write(line + '\n')

print("Replaced programmatically generated species with actual species names.")
