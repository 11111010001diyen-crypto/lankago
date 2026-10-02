export const trainLines = [
  { name: 'Main Line', stations: ['Colombo Fort', 'Maradana', 'Kelaniya', 'Ragama Junction', 'Gampaha', 'Ambepussa', 'Rambukkana', 'Kadugamuwa', 'Peradeniya Junction', 'Gampola', 'Nawalapitiya', 'Galboda', 'Watawala', 'Hatton', 'Nanu Oya', 'Ambewela', 'Pattipola', 'Ohiya', 'Haputale', 'Bandarawela', 'Ella', 'Demodara', 'Badulla'] },
  { name: 'Coastal Line', stations: ['Colombo Fort', 'Mount Lavinia', 'Moratuwa', 'Panadura', 'Kalutara North', 'Kalutara South', 'Beruwala', 'Bentota', 'Induruwa', 'Ahungalla', 'Balapitiya', 'Ambalangoda', 'Hikkaduwa', 'Galle', 'Unawatuna', 'Matara', 'Weligama', 'Mirissa', 'Kamburugamuwa', 'Beliatta'] },
  { name: 'Northern Line', stations: ['Polgahawela Junction', 'Kurunegala', 'Maho Junction', 'Galgamuwa', 'Thambuttegama', 'Talawa', 'Anuradhapura', 'Medawachchiya Junction', 'Vavuniya', 'Kilinochchi', 'Paranthan', 'Elephant Pass', 'Pallai', 'Jaffna', 'Kankesanthurai'] },
  { name: 'Puttalam Line', stations: ['Ragama Junction', 'Ja-Ela', 'Seeduwa', 'Katunayake', 'Negombo', 'Waikkala', 'Lunuwila', 'Nattandiya', 'Kudawewa', 'Madampe', 'Chilaw', 'Manuwangoda', 'Puttalam'] },
  { name: 'Kelani Valley Line', stations: ['Maradana', 'Nugegoda', 'Maharagama', 'Pannipitiya', 'Homagama', 'Meegoda', 'Padukka', 'Avissawella'] },
  { name: 'Matale Line', stations: ['Peradeniya Junction', 'Kandy', 'Mahiyawa', 'Katugastota', 'Ukuwela', 'Pathanpaha', 'Matale'] },
  { name: 'Batticaloa Line', stations: ['Maho Junction', 'Yapahuwa', 'Kalawewa', 'Habarana', 'Gal Oya Junction', 'Polonnaruwa', 'Manampitiya', 'Welikanda', 'Punanai', 'Batticaloa'] },
  { name: 'Trincomalee Line', stations: ['Gal Oya Junction', 'Kanthale', 'Mullipothanai', 'Thambalagamuwa', 'Trincomalee'] },
  { name: 'Talaimannar Line', stations: ['Medawachchiya Junction', 'Madhu Road', 'Murunkan', 'Mannar', 'Pesalai', 'Talaimannar'] },
]

export const allTrainStations = [...new Set(trainLines.flatMap((line) => line.stations))].sort()