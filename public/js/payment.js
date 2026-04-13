let currentMatchId = null;

// Open payment modal
async function openPaymentModal(matchId) {
    currentMatchId = matchId;
    const modal = document.getElementById('paymentModal');
    const paymentElement = document.getElementById('paymentElement');
    
    try {
        const response = await authFetch('/api/payment/create-payment-intent', {
            method: 'POST',
            body: { matchId, amount: 50 }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            paymentElement.innerHTML = `
                <div id="card-element" class="form-group"></div>
                <div id="card-errors" class="alert alert-error" style="display: none;"></div>
            `;
            
            const elements = stripe.elements();
            const cardElement = elements.create('card');
            cardElement.mount('#card-element');
            
            modal.style.display = 'block';
            
            // Handle payment submission
            const submitButton = document.getElementById('submitPayment');
            submitButton.onclick = async () => {
                const { error, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
                    payment_method: {
                        card: cardElement,
                        billing_details: {
                            name: getCurrentUser().teamName
                        }
                    }
                });
                
                if (error) {
                    document.getElementById('card-errors').textContent = error.message;
                    document.getElementById('card-errors').style.display = 'block';
                } else if (paymentIntent.status === 'succeeded') {
                    await verifyPayment(matchId);
                    document.getElementById('paymentMessage').innerHTML = 
                        '<div class="alert alert-success">Payment successful! Your match is confirmed.</div>';
                    setTimeout(() => {
                        modal.style.display = 'none';
                        showSection('myMatches');
                    }, 2000);
                }
            };
        }
    } catch (error) {
        showError('Failed to initialize payment');
    }
}

// Verify payment
async function verifyPayment(matchId) {
    const response = await authFetch(`/api/payment/verify/${matchId}`);
    const data = await response.json();
    return data.paid;
}

// Close modal
document.querySelector('.close').onclick = () => {
    document.getElementById('paymentModal').style.display = 'none';
};

window.onclick = (event) => {
    const modal = document.getElementById('paymentModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};