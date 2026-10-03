export const environment = {
    production: false,
    pexels_api_key: '', // https://www.pexels.com/api/new/
    open_meteo_lat: '', // latitute of your location
    open_meteo_lon: '', //  longitude of your location
    waste_postcode: '', // for the afvalkalender, like '7904EH'; leave empty to hide it
    waste_house_number: '', // with its letter or addition, if any: '10' or '10A'
    waste_away_evenings: [] as string[], // evenings you might not be home, like ['monday']: the reminder starts an evening earlier
};
