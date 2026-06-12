const url = 'https://oneorigin-team-fg0vj9gw.atlassian.net/rest/api/3/project';
const email = 'daniel.fernandes@oneorigin.us';
const token = 'ATATT3xFfGF0x89crit_mCn3k5GvhkoGNjs8PfMRN518rZluYiZfDxnINfKc7Z_n3q_7i6Ye_Iqnm1r5ja8WLN7KaRtDF8k2VCakpctsZ0_PQ-fdJgo3VQZpwU2h9bQHr2WpJ1M82LTV_INJVK2FjFeWkqvv5AW-ZLsdYcscGxRVzmfuKyc21cM=04822039';

const authHeader = `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;

fetch(url, {
    headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
    }
})
.then(res => res.text().then(text => ({ status: res.status, text })))
.then(result => {
    console.log("Status:", result.status);
    console.log("Body length:", result.text.length);
    if (result.status === 200) {
        console.log("First few projects:", JSON.parse(result.text).slice(0, 2));
    } else {
        console.log("Error body:", result.text);
    }
})
.catch(err => console.error(err));
