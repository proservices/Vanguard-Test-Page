# Vanguard Test Page

Static demo site for Vanguard UK / Genesys testing.

## Website usage

This project is intended to be published to GitHub Pages.

Main pages:

- `index.html`
- `vanguard-login.html`

Once published, users should open the site through the GitHub Pages URL and use the credentials below.

## How to move around the restricted area

- Open `index.html` from the published GitHub Pages site.
- Enter the site password to unlock the restricted area.
- After the gate opens, stay on the main page and use the visible page buttons and header links to move between the available states.
- Use the `LOG IN` link in the top navigation to go to the login page.
- After a successful persona login, you are returned to `index.html`.
- When logged in, the navigation link changes from `LOG IN` to `LOG OUT`.
- Clicking `LOG OUT` clears the active persona session.
- Use `Reset protection` if you want to fully clear stored access data and start again from the restricted-area password screen.

## Website access password

The main page is protected by a gate password.

- The gate password is not stored in plain text in the repo.
- The verification data lives in `src/database/gate-password.json` (salt + iterations + hash).
- For the current password, ask the repo owner / maintainer.

If needed, use the `Reset protection` button on the main page to clear local storage and start fresh.

## How login works

- The login page is `vanguard-login.html`.
- The `Username` field expects the persona full name.
- The `Password` field expects the matching password from `src/database/login-passwords.json`.
- On successful login, the app stores the active persona in local storage and redirects to `index.html`.
- The logged-in persona's `userId` and `dateOfBirth` are sent into Genesys Messenger custom attributes.
- If already logged in, the login button changes to `LOG OUT`.

## How to test logged-in and logged-out states

- To test the logged-out state, unlock the restricted area and remain on `index.html` without logging in as a persona.
- To test the logged-in state, click `LOG IN`, enter one of the persona credentials below, and you will return to `index.html` in the logged-in state.
- To switch back, use the `LOG OUT` button or `LOG OUT` navigation link.
- You do not need to leave the restricted area to compare these states. The main testing flow is to stay inside the site and use the existing buttons and links.

## Persona login credentials

### Jonathan Doe

- Username: `Jonathan Doe`
- Password: `Jon123`
- User ID: `550e8400-e29b-41d4-a716-446655440000`
- Date of birth: `1985-03-15`
- Status: `Active`

### Emily Smith

- Username: `Emily Smith`
- Password: `Emi123`
- User ID: `660e8400-e29b-41d4-a716-446655440001`
- Date of birth: `1990-07-22`
- Status: `Active`

### Michael Brown

- Username: `Michael Brown`
- Password: `Mic123`
- User ID: `770e8400-e29b-41d4-a716-446655440002`
- Date of birth: `1982-11-05`
- Status: `Inactive`

## Persona input data

These are the seeded values available in the JSON files for each persona.

### Jonathan Doe

- Name: `Jonathan Doe`
- Title: `Mr`
- Email: `jonathan.doe@example.com`
- Mobile: `+44 7700 900001`
- Home phone: `+44 20 7946 0000`
- Country: `United Kingdom`
- Birth city: `London`
- Birth country: `United Kingdom`
- Customer ID: `1234567`
- Address line 1: `Low street`
- Address line 2: `Flat 15`
- Address city: `London`
- Address region: `South East`
- Postal code: `SW1A 1AA`
- Address country: `GB`
- Funds:
  - `FND-001` Global Tech Growth Fund, ISIN `IE00B4L60045`, `GBP`, unit price `325.4`, unit count `5`, dealing status `Open`
  - `FND-002` UK Equity Index Fund, ISIN `GB0002374338`, `GBP`, unit price `250.75`, unit count `7`, dealing status `Open`

### Emily Smith

- Name: `Emily Smith`
- Title: `Ms`
- Email: `emily.smith@example.com`
- Mobile: `+44 7700 900002`
- Home phone: `+44 20 7946 0001`
- Country: `United Kingdom`
- Birth city: `Manchester`
- Birth country: `United Kingdom`
- Address line 1: `Conder Green`
- Address line 2: `Flat 2A`
- Address city: `London`
- Address region: `Lancashire`
- Postal code: `LA2 0BC`
- Address country: `United Kingdom`
- Funds:
  - `FND-003` European Balanced Fund, ISIN `LU0093579457`, `EUR`, unit price `198.25`, unit count `3`, dealing status `Closed`
  - `FND-004` US Blue Chip Equity Fund, ISIN `US78462F1030`, `USD`, unit price `412.9`, unit count `4`, dealing status `Open`

### Michael Brown

- Name: `Michael Brown`
- Title: `Mr`
- Email: `michael.brown@example.com`
- Mobile: `+44 7700 900003`
- Home phone: `+44 20 7946 0002`
- Country: `United Kingdom`
- Birth city: `Birmingham`
- Birth country: `United Kingdom`
- Address line 1: `78 Broad Street`
- Address line 2: `Suite 10`
- Address city: `Birmingham`
- Address region: `England`
- Postal code: `B1 2HF`
- Address country: `United Kingdom`
- Funds:
  - `FND-005` Asia Pacific Opportunities Fund, ISIN `SG1T75931496`, `USD`, unit price `287.6`, unit count `2`, dealing status `Suspended`
  - `FND-006` Global Sustainable Income Fund, ISIN `IE00BYVQ9K79`, `GBP`, unit price `154.3`, unit count `6`, dealing status `Open`

## Data files

- Login credentials: `src/database/login-passwords.json`
- Profiles: `src/database/profile.json`
- Addresses: `src/database/address.json`
- Funds: `src/database/fund.json`