const currentUser = JSON.parse(
    sessionStorage.getItem("easycookCurrentUser") || "null"
);

let mealStorageKey = "easycookMeals";

if (currentUser !== null) {
    mealStorageKey = "easycookMeals_" + currentUser.email;
}

let recipes = [];
let selectedMeal = null;
let mealPlans = [];
let editingIndex = -1;

const apiURL = "https://www.themealdb.com/api/json/v1/1/";

// Read saved meals
try {
    const savedMeals = localStorage.getItem(mealStorageKey);

    if (savedMeals !== null) {
        mealPlans = JSON.parse(savedMeals);

        if (!Array.isArray(mealPlans)) {
            mealPlans = [];
        }
    }
} catch (error) {
    showMessage("Saved meals could not be loaded.");
}

// Display a message
function showMessage(text) {
    document.getElementById("message").textContent = text;
}

// Make text safe to display inside HTML
function safeText(text) {
    return String(text || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

// Choose recipes that match the user's conditions
function chooseRecipes(categoryMeals, ingredientMeals, ingredient) {
    let suggestions = [];

    if (ingredient === "") {
        // No ingredient entered: recommend the category recipes
        suggestions = categoryMeals;
    } else {
        // Ingredient entered: compare both recipe lists
        for (let i = 0; i < categoryMeals.length; i++) {
            for (let j = 0; j < ingredientMeals.length; j++) {
                if (
                    categoryMeals[i].idMeal ===
                    ingredientMeals[j].idMeal
                ) {
                    suggestions.push(categoryMeals[i]);
                    break;
                }
            }
        }
    }

    return suggestions;
}

// Get recipes from the selected category
// Get API data and display our recipe suggestions
async function displayRecipes() {
    const category = document.getElementById("category").value;

    const ingredient = document.getElementById("ingredient")
        .value.trim().toLowerCase();

    const recipeList = document.getElementById("recipeList");
    const button = document.getElementById("findButton");

    // Clear the previous search
    recipes = [];
    selectedMeal = null;

    recipeList.innerHTML = "";
    document.getElementById("recipeDetails").hidden = true;

    // Ask for one ingredient only
    if (ingredient.includes(",") || ingredient.includes(";")) {
        showMessage("Please enter only one ingredient, such as garlic.");
        return;
    }

    button.disabled = true;
    showMessage("Finding suitable recipes...");

    try {
        // Request recipes from the selected category
        const response = await fetch(
            apiURL + "filter.php?c=" + encodeURIComponent(category),
            { signal: AbortSignal.timeout(15000) }
        );

        if (!response.ok) {
            throw new Error("Category request failed");
        }

        const data = await response.json();
        const categoryMeals = data.meals || [];

        let ingredientMeals = [];

        // Only request ingredient recipes when an ingredient is entered
        if (ingredient !== "") {
            const ingredientName = ingredient.replaceAll(" ", "_");

            const ingredientResponse = await fetch(
                apiURL + "filter.php?i=" +
                encodeURIComponent(ingredientName),
                { signal: AbortSignal.timeout(15000) }
            );

            if (!ingredientResponse.ok) {
                throw new Error("Ingredient request failed");
            }

            const ingredientData = await ingredientResponse.json();

            ingredientMeals = ingredientData.meals || [];
        }

        // Apply our own matching rules
        recipes = chooseRecipes(
            categoryMeals,
            ingredientMeals,
            ingredient
        );

        // Give a fallback message if nothing matches
        if (recipes.length === 0) {
            showMessage(
                "No suitable recipes found. Try another ingredient or category."
            );
        } else {
            let reason = "";

            if (ingredient === "") {
                reason = "Recommended because it matches your " +
                    category + " category.";
            } else {
                reason = "Recommended because it matches your " +
                    category + " category and contains " + ingredient + ".";
            }

            let html = "";

            for (let i = 0; i < recipes.length; i++) {
                recipes[i].suggestionReason = reason;

                html += `
                    <div class="card">
                        <img
                            src="${safeText(recipes[i].strMealThumb)}"
                            alt="${safeText(recipes[i].strMeal)}"
                            class="recipe-image"
                            loading="lazy"
                        >

                        <h3>${safeText(recipes[i].strMeal)}</h3>

                        <p>${safeText(reason)}</p>

                        <button onclick="viewRecipe(${i})">
                            View Recipe
                        </button>
                    </div>
                `;
            }

            recipeList.innerHTML = html;

            showMessage(
                recipes.length + " suitable recipe(s) found."
            );
        }
    } catch (error) {
        recipes = [];

        showMessage(
            "Cannot load recipes. Check your internet and try again."
        );
    }

    button.disabled = false;
}

// Get ingredients and cooking instructions
async function viewRecipe(index) {
    const button = document.getElementById("findButton");

    if (button.disabled === true) {
        return;
    }

    button.disabled = true;

    document.getElementById("recipeDetails").hidden = true;
    selectedMeal = null;

    showMessage("Loading recipe details...");

    try {
        
        // Get recipes from the selected category
        const id = recipes[index].idMeal;

        const response = await fetch(
            apiURL + "lookup.php?i=" + encodeURIComponent(id),
            { signal: AbortSignal.timeout(15000) }
        );

        // Check whether the request succeeded
        if (!response.ok) {
            throw new Error("Request failed");
        }

        const data = await response.json();

        if (!data.meals || data.meals.length === 0) {
            showMessage("Recipe details are not available.");
        } else {
            selectedMeal = data.meals[0];

            selectedMeal.suggestionReason = recipes[index].suggestionReason;

            document.getElementById("recipeName").textContent =
                selectedMeal.strMeal;

            document.getElementById("recipeInfo").textContent =
                "Category: " + selectedMeal.strCategory +
                " | Cuisine: " + (selectedMeal.strArea || "Not provided");

            let ingredients = "";

            for (let i = 1; i <= 20; i++) {
                const ingredient = selectedMeal["strIngredient" + i];
                const measure = selectedMeal["strMeasure" + i];

                if (ingredient && ingredient.trim() !== "") {
                    ingredients +=
                        "<li>" +
                        safeText(measure) + " " +
                        safeText(ingredient) +
                        "</li>";
                }
            }

            document.getElementById("ingredientList").innerHTML =
                ingredients;

            document.getElementById("instructions").textContent =
                selectedMeal.strInstructions || "No instructions provided.";

            document.getElementById("recipeDetails").hidden = false;

            showMessage("Recipe details loaded.");

            document.getElementById("recipeDetails").scrollIntoView();
        }
    } catch (error) {
        selectedMeal = null;
        document.getElementById("servings").value = "1";
        document.getElementById("costResult").textContent = "";
        showMessage("Cannot load recipe details. Please try again.");
    }

    button.disabled = false;
}

// Calculate estimated cost using RM7 per serving
function calculateCost() {
    const input = document.getElementById("servings");
    const result = document.getElementById("costResult");

    const servings = Number(input.value);
    const costPerServing = 7;

    if (
        !Number.isInteger(servings) ||
        servings < 1 ||
        servings > 100
    ) {
        result.textContent =
            "Please enter a whole number from 1 to 100 servings.";
        return;
    }

    const totalCost = servings * costPerServing;

    result.textContent =
        "Estimated total cost for " + servings +
        " serving(s): RM" + totalCost.toFixed(2);
}

// CREATE: Add a meal
function addMeal() {
    if (selectedMeal === null) {
        showMessage("Please select a recipe first.");
        return;
    }

    let alreadySaved = false;

    for (let i = 0; i < mealPlans.length; i++) {
        if (mealPlans[i].name === selectedMeal.strMeal) {
            alreadySaved = true;
        }
    }

    if (alreadySaved === true) {
        showMessage("This recipe is already saved.");
        return;
    }

    const meal = {
    recipeId: selectedMeal.idMeal,
    name: selectedMeal.strMeal,
    category: selectedMeal.strCategory,
    date: "",
    mealType: "",
    suggestionReason: selectedMeal.suggestionReason
    };

    mealPlans.push(meal);

    if (saveMeals() === true) {
        showMessage("Meal added! Open Meal Planner to set its date and type.");
    } else {
        mealPlans.pop();
    }
}

// Save meals in Local Storage
function saveMeals() {
    try {
        localStorage.setItem(
            mealStorageKey,
            JSON.stringify(mealPlans)
        );

        return true;
    } catch (error) {
        showMessage("Unable to save changes. Please try again.");
        return false;
    }
}

// READ: Display saved meals
function displayMealPlans() {
    const mealList = document.getElementById("mealList");

    mealList.innerHTML = "";
    cancelEdit();

    if (mealPlans.length === 0) {
        showMessage("No meals saved yet. Add one from Recipe Finder.");
    } else {
        let html = "";

        for (let i = 0; i < mealPlans.length; i++) {
            const date = mealPlans[i].date || "Not set";
            const type = mealPlans[i].mealType || "Not set";

            html += `
                <div class="card">
                    <span class="category-label">
                        ${safeText(mealPlans[i].category)}
                    </span>

                    <h3>${safeText(mealPlans[i].name)}</h3>

                    <p>Date: ${safeText(date)}</p>
                    <p>Meal type: ${safeText(type)}</p>
                    <p>
                        ${safeText(mealPlans[i].suggestionReason ||
                            "Saved before recommendations were added.")}
                    </p>

                    <button onclick="editMeal(${i})">
                        Edit
                    </button>

                    <button
                        class="remove-button"
                        onclick="removeMeal(${i})"
                    >
                        Remove
                    </button>
                </div>
            `;
        }

        mealList.innerHTML = html;

        showMessage(mealPlans.length + " saved meal(s).");
    }
}

// Open the edit form
function editMeal(index) {
    editingIndex = index;

    document.getElementById("editingMealName").textContent =
        mealPlans[index].name;

    document.getElementById("mealDate").value =
        mealPlans[index].date || "";

    document.getElementById("mealType").value =
        mealPlans[index].mealType || "Dinner";

    document.getElementById("editBox").hidden = false;

    showMessage("Choose a date and meal type.");

    document.getElementById("editBox").scrollIntoView();
}

// UPDATE: Save changes to a meal
function updateMeal() {
    if (editingIndex === -1) {
        showMessage("Please select a meal to edit.");
        return;
    }

    const dateInput = document.getElementById("mealDate");
    const type = document.getElementById("mealType").value;

    if (dateInput.value === "" || !dateInput.checkValidity()) {
        showMessage("Please enter a valid meal date.");
        return;
    }

    if (
        type !== "Breakfast" &&
        type !== "Lunch" &&
        type !== "Dinner" &&
        type !== "Snack"
    ) {
        showMessage("Please select a valid meal type.");
        return;
    }

    const oldDate = mealPlans[editingIndex].date;
    const oldType = mealPlans[editingIndex].mealType;

    mealPlans[editingIndex].date = dateInput.value;
    mealPlans[editingIndex].mealType = type;

    if (saveMeals() === true) {
        displayMealPlans();
        showMessage("Meal plan updated successfully!");
    } else {
        mealPlans[editingIndex].date = oldDate;
        mealPlans[editingIndex].mealType = oldType;
    }
}

// Close the edit form
function cancelEdit() {
    editingIndex = -1;
    document.getElementById("editBox").hidden = true;
}

// DELETE: Remove a meal
function removeMeal(index) {
    const answer = confirm("Remove this meal?");

    if (answer === true) {
        const removedMeal = mealPlans[index];

        mealPlans.splice(index, 1);

        if (saveMeals() === true) {
            displayMealPlans();
            showMessage("Meal removed successfully.");
        } else {
            mealPlans.splice(index, 0, removedMeal);
        }
    }
}

// Run the code for the current page
if (document.getElementById("recipeList") !== null) {
    showMessage("Select a category and click Find Recipes.");
}

if (document.getElementById("mealList") !== null) {
    displayMealPlans();
}