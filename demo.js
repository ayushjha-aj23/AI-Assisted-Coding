// function to calculate the area of circle 
function areaOfCircle(radius) {
    return Math.PI * radius * radius;
}

// function to validate an email address using regex
function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
} 

// function to fetch data from an API endpoint and log the response
async function fetchData(url) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}


