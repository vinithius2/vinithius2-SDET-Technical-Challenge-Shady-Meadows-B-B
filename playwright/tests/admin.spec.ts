import { test, expect, Page } from '@playwright/test';

// Reference: https://playwright.dev/docs/writing-tests

// Labels
const username_label = "Username"
const password_label = "Password"
const button_label = "button"

// Credentials
const username = "admin"
const password = "password"

// Url's
const homepage = "https://automationintesting.online"
const admin = "https://automationintesting.online/admin"
const dashboard = "https://automationintesting.online/admin/rooms"

/**
 * Check if the login components are visible on the page.
 * @param page 
 */
async function loginComponentsIsVisible(page: Page) {
    await expect(page.getByLabel(username_label)).toBeVisible();
    await expect(page.getByLabel(password_label)).toBeVisible();
    await expect(page.getByRole(button_label, { name: 'Login' })).toBeVisible();
}

/**
 * Perform the login action by filling in the username and password fields and clicking the login button.
 * @param page 
 */
async function loginAction(page: Page) {
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
}

/**
 * Validate that the login was successful by checking the URL and the visibility of the logout button.
 * @param page 
 */
async function loginValidate(page: Page) {
    await page.waitForURL(dashboard);
    await expect(page.getByRole(button_label, { name: 'Logout' })).toBeVisible();
}

/**
 * Get the details of the rooms from the homepage.
 * @param page 
 * @returns An array of room objects with name, price, and amenities.
 */
async function getObjectFromHomePage(page: Page) {
    const roomsSection = page.locator('section').filter({
        has: page.getByRole('heading', { name: 'Our Rooms' })
    });

    const roomNames = await roomsSection.getByRole('heading', { level: 5 }).allTextContents();
    const rooms = await Promise.all(roomNames.map(async (roomName) => {
        
        const card = roomsSection.locator('div').filter({
            has: page.getByRole('heading', { name: roomName, level: 5 })
        }).filter({
            has: page.getByRole('link', { name: 'Book now' })
        }).last();

        const priceText = await card.getByText(/£\d+/).textContent();
        const price = priceText!.match(/\d+/)![0];
        const amenities = (await card.locator('span').allTextContents())
            .map(a => a.trim().toLowerCase())
            .filter(a => a.length > 0);

        return { name: roomName, price, amenities };
    }));
    return rooms;
}

async function getObjectFromAdmin(page: Page) {
    await page.getByTestId('roomlisting').first().waitFor();
    const rows = await page.getByTestId('roomlisting').all();
    const rooms = Promise.all(rows.map(async (row) => {

        const cells = await row.locator('p').allTextContents();
        return {
            type: cells[1].toLowerCase(),
            price: cells[3].trim(),
            amenities: cells[4].split(',').map(a => a.trim().toLowerCase())
        };

    }));
    return rooms;
}

test.describe('Admin Authentication & Dashboard', () => {

    // Test titles
    const testLogin = "All login flow: login, dashboard access, logout"
    const testBonus = "(Bonus) Navigate to the \"Rooms\" tab within the admin panel and verify a room's details match what you saw on the public homepage."

    // Navigate to the Admin.
    test.beforeEach(async ({ page }) => {
        await page.goto(admin, {
            waitUntil: 'load'
        });
    });

    test(testLogin, async ({ page }) => {
        // Is visible the login form?
        await loginComponentsIsVisible(page);
        // If yes, fill the form and submit.
        await loginAction(page);
        // Redirected to the Dashboard/Inboxes view?
        await loginValidate(page);
    });

    test(testBonus, async ({ page }) => {
        await page.goto(homepage, { waitUntil: 'load' });
        const roomsHomePage = await getObjectFromHomePage(page);
        await page.goto(admin, { waitUntil: 'load' });
        await loginComponentsIsVisible(page);
        await loginAction(page);
        await loginValidate(page);
        const roomsAdmin = await getObjectFromAdmin(page);

        console.log("Rooms from homepage:", roomsHomePage);
        console.log("Rooms from admin:", roomsAdmin);
        
        for (const homeRoom of roomsHomePage) {
            const adminRoom = roomsAdmin.find(r => r.type === homeRoom.name.toLowerCase());
            expect(adminRoom, `Room "${homeRoom.name}" not found in admin`).toBeDefined();
            expect(adminRoom!.price).toBe(homeRoom.price);
            expect(adminRoom!.amenities.sort()).toEqual(homeRoom.amenities.sort());
        }
    });
});
