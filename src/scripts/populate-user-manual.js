const mongoose = require('mongoose');

// Connect to MongoDB
async function dbConnect() {
  try {
    if (mongoose.connections[0].readyState) {
      return;
    }

    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://fsadik2319:v17Ad1JygFqbVPWd@journalweb1.oeyvwhv.mongodb.net/?retryWrites=true&w=majority&appName=journalweb1';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// User Manual Schema
const userManualSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['text', 'image'],
    required: true,
  },
  heading: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
  },
  order: {
    type: Number,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

const UserManual = mongoose.models.UserManual || mongoose.model('UserManual', userManualSchema);

const manualSections = [
  {
    type: 'text',
    heading: 'Getting Started',
    content: `
      <h3>Welcome to Our Journal Platform</h3>
      <p>This comprehensive guide will help you navigate through the submission, review, and publication process. Our platform is designed to streamline the academic publishing workflow for authors, reviewers, and editors.</p>
      
      <h4>Key Features:</h4>
      <ul>
        <li><strong>Manuscript Submission</strong>: Submit your research articles with complete metadata</li>
        <li><strong>Real-time Tracking</strong>: Monitor your manuscript's progress through the review process</li>
        <li><strong>Integrated Payment</strong>: Secure payment processing for publication fees</li>
        <li><strong>Communication Tools</strong>: Direct communication with editors and reviewers</li>
        <li><strong>Dashboard Management</strong>: Centralized view of all your submissions</li>
      </ul>
    `,
    order: 1,
  },
  {
    type: 'text',
    heading: 'Account Registration & Login',
    content: `
      <h3>Creating Your Account</h3>
      <ol>
        <li><strong>Visit the Registration Page</strong>
          <ul>
            <li>Navigate to the journal website</li>
            <li>Click on "Sign Up" or "Register"</li>
          </ul>
        </li>
        <li><strong>Fill in Your Information</strong>
          <ul>
            <li><strong>Full Name</strong>: Enter your complete name as it should appear in publications</li>
            <li><strong>Email Address</strong>: Use your institutional or professional email</li>
            <li><strong>Password</strong>: Create a strong password (minimum 8 characters)</li>
            <li><strong>Institution</strong>: Your current academic or professional affiliation</li>
            <li><strong>ORCID ID</strong> (Optional): Link your ORCID profile for better identification</li>
          </ul>
        </li>
        <li><strong>Verify Your Email</strong>
          <ul>
            <li>Check your inbox for a verification email</li>
            <li>Click the verification link to activate your account</li>
          </ul>
        </li>
      </ol>

      <h3>Logging In</h3>
      <ol>
        <li>Go to the login page</li>
        <li>Enter your registered email and password</li>
        <li>Click "Sign In"</li>
      </ol>

      <h3>Password Recovery</h3>
      <p>If you forget your password:</p>
      <ol>
        <li>Click "Forgot Password" on the login page</li>
        <li>Enter your registered email address</li>
        <li>Check your email for reset instructions</li>
        <li>Follow the link to create a new password</li>
      </ol>
    `,
    order: 2,
  },
  {
    type: 'text',
    heading: 'Manuscript Submission Guide',
    content: `
      <h3>Before You Submit</h3>
      
      <h4>Required Materials:</h4>
      <ul>
        <li>Complete manuscript file (PDF, DOC, or DOCX)</li>
        <li>Abstract (maximum 250 words)</li>
        <li>Keywords (3-8 keywords)</li>
        <li>Author information for all co-authors</li>
        <li>Corresponding author designation</li>
      </ul>

      <h4>Optional Materials:</h4>
      <ul>
        <li>Cover letter</li>
        <li>Supplementary files</li>
        <li>Funding information</li>
        <li>Conflict of interest statement</li>
        <li>Ethics statement</li>
        <li>Data availability statement</li>
      </ul>

      <h3>Step-by-Step Submission Process</h3>

      <h4>Step 1: Manuscript Details</h4>
      <ol>
        <li><strong>Navigate to Submission</strong>
          <ul>
            <li>From your dashboard, click "Submit New Manuscript"</li>
            <li>Or use the "Submit" link in the main navigation</li>
          </ul>
        </li>
        <li><strong>Enter Basic Information</strong>
          <ul>
            <li><strong>Title</strong>: Enter your complete manuscript title</li>
            <li><strong>Abstract</strong>: Paste your abstract (maximum 250 words)</li>
            <li><strong>Category</strong>: Select the appropriate article type from our comprehensive list</li>
          </ul>
        </li>
        <li><strong>Add Keywords</strong>
          <ul>
            <li>Enter keywords one at a time</li>
            <li>Click "Add" to include each keyword</li>
            <li>Use specific, relevant terms that describe your research</li>
          </ul>
        </li>
      </ol>

      <h4>Step 2: Author Information</h4>
      <ol>
        <li><strong>Add Authors</strong>
          <ul>
            <li>Fill in details for each author: First Name, Last Name, Email, Affiliation, ORCID ID</li>
          </ul>
        </li>
        <li><strong>Designate Corresponding Author</strong>
          <ul>
            <li>Check "Corresponding Author" for the main contact person</li>
            <li>This person will receive all communication about the manuscript</li>
          </ul>
        </li>
      </ol>

      <h4>Step 3: File Upload</h4>
      <ul>
        <li>Drag and drop files or click to browse</li>
        <li>Supported formats: PDF, DOC, DOCX</li>
        <li>Maximum file size: 50MB per file</li>
        <li>At least one main manuscript file is required</li>
      </ul>
    `,
    order: 3,
  },
  {
    type: 'text',
    heading: 'User Dashboard',
    content: `
      <h3>Dashboard Overview</h3>
      <p>Your dashboard is the central hub for managing all your manuscript submissions and account activities.</p>

      <h4>Dashboard Sections:</h4>
      <ul>
        <li><strong>Overview Statistics</strong>: Total submissions, under review, accepted, rejected</li>
        <li><strong>Recent Manuscripts</strong>: View your most recent submissions with status</li>
        <li><strong>Quick Actions</strong>: Submit new manuscript, view all submissions, update profile</li>
      </ul>

      <h3>Managing Your Manuscripts</h3>
      
      <h4>Viewing Manuscript Details</h4>
      <p>Click on any manuscript title to view:</p>
      <ul>
        <li>Complete manuscript information</li>
        <li>Author details and uploaded files</li>
        <li>Review history and timeline</li>
        <li>Payment information (if applicable)</li>
      </ul>

      <h4>Submission Statuses:</h4>
      <ul>
        <li><strong>Submitted</strong>: Initial submission received</li>
        <li><strong>Under Review</strong>: Manuscript is being peer-reviewed</li>
        <li><strong>Revision Requested</strong>: Reviewers have requested changes</li>
        <li><strong>Accepted</strong>: Manuscript accepted for publication</li>
        <li><strong>Payment Required</strong>: Publication fee payment needed</li>
        <li><strong>In Production</strong>: Copy-editing and typesetting in progress</li>
        <li><strong>Published</strong>: Article is live and available</li>
      </ul>

      <h3>Profile Management</h3>
      <p>Keep your profile updated with current information:</p>
      <ul>
        <li>Personal details (name, email)</li>
        <li>Institutional affiliation</li>
        <li>ORCID ID</li>
        <li>Contact information</li>
      </ul>
    `,
    order: 4,
  },
  {
    type: 'text',
    heading: 'Payment & Publication Fees',
    content: `
      <h3>Understanding Publication Fees</h3>
      <p>Our journal operates on an Article Processing Charge (APC) model to cover the costs of peer review, copy-editing, typesetting, and online publication.</p>

      <h4>Standard Fees by Article Type:</h4>
      <ul>
        <li>Research Articles: $2,000 USD</li>
        <li>Review Articles: $2,200 USD</li>
        <li>Meta-Analysis: $2,500 USD</li>
        <li>Case Studies: $1,800 USD</li>
        <li>Commentary: $1,500 USD</li>
        <li>Editorials: $1,200 USD</li>
        <li>Letters to Editor: $800 USD</li>
        <li>Technical Notes: $1,700 USD</li>
      </ul>

      <h3>Fee Waivers and Discounts</h3>
      <ul>
        <li><strong>Automatic Waivers</strong> (100% discount): Authors from low-income countries</li>
        <li><strong>Partial Discounts</strong> (50% discount): Authors from lower-middle-income countries</li>
      </ul>

      <h3>Payment Process</h3>
      
      <h4>When Payment is Required:</h4>
      <ol>
        <li><strong>After Acceptance</strong>: Payment is only required after peer review acceptance</li>
        <li><strong>Payment Deadline</strong>: 30 days from acceptance notification</li>
        <li><strong>No Upfront Costs</strong>: No fees during submission or review</li>
      </ol>

      <h3>Bank Transfer Payment Process</h3>
      <p>Our journal primarily uses bank transfer for publication fee payments. This method is secure, reliable, and suitable for both individual and institutional payments.</p>

      <h4>Step-by-Step Payment Process:</h4>
      <ol>
        <li><strong>Payment Notification</strong>: Receive acceptance email with payment details and invoice</li>
        <li><strong>Review Payment Information</strong>: 
          <ul>
            <li>Check payment amount and currency</li>
            <li>Note your manuscript ID for reference</li>
            <li>Review payment deadline (30 days from acceptance)</li>
          </ul>
        </li>
        <li><strong>Access Payment Details</strong>: 
          <ul>
            <li>From your dashboard, click on the accepted manuscript</li>
            <li>Click "View Payment Details" or "Make Payment"</li>
            <li>Download invoice and payment instructions</li>
          </ul>
        </li>
        <li><strong>Bank Transfer Details</strong>: 
          <ul>
            <li>Use the bank account information provided in your payment notification</li>
            <li>Include your manuscript ID in the transfer reference</li>
            <li>Ensure you include all required transfer details</li>
          </ul>
        </li>
        <li><strong>Submit Payment Proof</strong>: 
          <ul>
            <li>Upload bank transfer receipt or proof of payment</li>
            <li>Include transaction reference number</li>
            <li>Submit through your dashboard payment section</li>
          </ul>
        </li>
      </ol>

      <h4>Important Payment Information:</h4>
      <ul>
        <li><strong>Currency</strong>: Payments are typically processed in USD</li>
        <li><strong>Processing Time</strong>: Bank transfers may take 3-5 business days to process</li>
        <li><strong>Reference Number</strong>: Always include your manuscript ID in transfer reference</li>
        <li><strong>Proof Required</strong>: Upload payment proof for verification</li>
      </ul>

      <h3>After Payment</h3>
      <ul>
        <li><strong>Payment Verification</strong>: Bank transfers are manually verified by our finance team</li>
        <li><strong>Confirmation Timeline</strong>: Payment confirmation within 3-5 business days</li>
        <li><strong>Email Notification</strong>: You'll receive payment confirmation via email</li>
        <li><strong>Dashboard Update</strong>: Payment status will update in your dashboard</li>
        <li><strong>Production Begins</strong>: Manuscript moves to copy-editing phase after payment confirmation</li>
      </ul>

      <h3>Payment Troubleshooting</h3>
      <h4>Common Issues:</h4>
      <ul>
        <li><strong>Transfer Delays</strong>: International transfers may take longer</li>
        <li><strong>Missing Reference</strong>: Always include manuscript ID in transfer details</li>
        <li><strong>Currency Conversion</strong>: Bank fees and exchange rates may apply</li>
        <li><strong>Proof of Payment</strong>: Upload clear, legible payment receipts</li>
      </ul>

      <h4>Contact Support if:</h4>
      <ul>
        <li>Payment not confirmed after 7 business days</li>
        <li>Issues with bank transfer process</li>
        <li>Need payment deadline extension</li>
        <li>Questions about payment amount or currency</li>
      </ul>
    `,
    order: 5,
  },
  {
    type: 'text',
    heading: 'Review Process',
    content: `
      <h3>Editorial Review Stages</h3>

      <h4>1. Initial Editorial Screening (1-2 weeks)</h4>
      <ul>
        <li>Editor checks manuscript scope and quality</li>
        <li>Ensures submission guidelines are followed</li>
        <li>Verifies all required materials are included</li>
      </ul>

      <h4>2. Peer Review Assignment (1-2 weeks)</h4>
      <ul>
        <li>Editor identifies potential reviewers</li>
        <li>Invitations sent to 2-3 expert reviewers</li>
        <li>Reviewer acceptance confirmation</li>
      </ul>

      <h4>3. Peer Review Process (4-8 weeks)</h4>
      <ul>
        <li>Reviewers evaluate your manuscript</li>
        <li>Assess methodology, significance, and presentation</li>
        <li>Provide detailed comments and recommendations</li>
      </ul>

      <h4>4. Editorial Decision (1-2 weeks)</h4>
      <ul>
        <li>Editor reviews all reviewer comments</li>
        <li>Makes final decision on manuscript</li>
        <li>Prepares decision letter with feedback</li>
      </ul>

      <h3>Review Outcomes</h3>

      <h4>Accept</h4>
      <ul>
        <li>Rare for first submission, usually requires minor revisions</li>
        <li>Next steps: Payment required, then production begins</li>
        <li>Timeline: Publication within 4-6 weeks after payment</li>
      </ul>

      <h4>Minor Revision</h4>
      <ul>
        <li>Small changes needed (clarification, additional references)</li>
        <li>Deadline: Usually 4-6 weeks for revisions</li>
        <li>May or may not require additional review</li>
      </ul>

      <h4>Major Revision</h4>
      <ul>
        <li>Significant changes needed (additional experiments, restructuring)</li>
        <li>Deadline: Usually 8-12 weeks for revisions</li>
        <li>Full peer review of revised manuscript</li>
      </ul>

      <h4>Reject</h4>
      <ul>
        <li>Fundamental issues with study or presentation</li>
        <li>Appeal process available if decision seems unfair</li>
        <li>Resubmission generally not encouraged for the same study</li>
      </ul>

      <h3>Timeline Expectations</h3>
      <ul>
        <li><strong>Initial Submission to First Decision</strong>: 8-12 weeks</li>
        <li><strong>Revision to Final Decision</strong>: 6-10 weeks</li>
        <li><strong>Acceptance to Publication</strong>: 4-8 weeks</li>
      </ul>
    `,
    order: 6,
  },
  {
    type: 'text',
    heading: 'Copy-Editing & Production',
    content: `
      <h3>Copy-Editing Process</h3>
      <p>After payment confirmation, your manuscript enters the production phase where it's prepared for final publication.</p>

      <h4>Copy Editor Assignment</h4>
      <ul>
        <li>You'll be notified when a copy editor is assigned</li>
        <li>Introduction email with copy editor details</li>
        <li>Typical copy-editing takes 2-3 weeks</li>
      </ul>

      <h4>What Copy Editors Do:</h4>
      <ul>
        <li><strong>Language and Style</strong>: Grammar, spelling, punctuation corrections</li>
        <li><strong>Formatting</strong>: Reference style compliance, figure and table formatting</li>
        <li><strong>Technical Review</strong>: Mathematical notation, chemical nomenclature verification</li>
      </ul>

      <h4>Author Review Process</h4>
      <ol>
        <li><strong>Copy-Edited Version</strong>: You'll receive the edited manuscript</li>
        <li><strong>Review Period</strong>: 5-7 days to review changes</li>
        <li><strong>Feedback Options</strong>:
          <ul>
            <li>Accept Changes: Approve all edits</li>
            <li>Request Modifications: Suggest specific changes</li>
            <li>Reject Changes: Explain disagreements with edits</li>
          </ul>
        </li>
      </ol>

      <h4>Galley Proof Review</h4>
      <ul>
        <li><strong>Formatted Proof</strong>: Final formatted version for your review</li>
        <li><strong>Final Check</strong>: Last opportunity to catch errors</li>
        <li><strong>Minor Changes Only</strong>: Only small corrections allowed at this stage</li>
        <li><strong>Quick Turnaround</strong>: 2-3 days for proof review</li>
      </ul>

      <h3>Production Timeline</h3>
      <ul>
        <li><strong>Week 1-2</strong>: Copy Editing - Grammar, style, reference formatting</li>
        <li><strong>Week 3</strong>: Author Review - Feedback incorporation and approval</li>
        <li><strong>Week 4</strong>: Typesetting - Professional formatting and layout</li>
        <li><strong>Week 5</strong>: Galley Proof - Final formatted version review</li>
        <li><strong>Week 6</strong>: Publication - Final file preparation and online publication</li>
      </ul>

      <h3>Quality Assurance</h3>
      <ul>
        <li>Multiple review stages with copy editor, author verification, and proofreader check</li>
        <li>Before publication: Unlimited corrections possible</li>
        <li>After publication: Corrections via errata or corrigenda</li>
      </ul>
    `,
    order: 7,
  },
  {
    type: 'text',
    heading: 'Troubleshooting & Support',
    content: `
      <h3>Common Technical Issues</h3>

      <h4>Login Problems</h4>
      <ul>
        <li><strong>Can't Remember Password</strong>: Use "Forgot Password", check email (including spam)</li>
        <li><strong>Account Locked</strong>: Wait 30 minutes or contact support</li>
        <li><strong>Email Not Verified</strong>: Check spam folders, request new verification email</li>
      </ul>

      <h4>Submission Issues</h4>
      <ul>
        <li><strong>File Upload Problems</strong>: Check file size (max 50MB), verify format (PDF, DOC, DOCX)</li>
        <li><strong>Form Not Saving</strong>: Ensure required fields completed, check internet connection</li>
        <li><strong>Missing Manuscripts</strong>: Check correct account, verify submission completion</li>
      </ul>

      <h4>Payment Issues</h4>
      <ul>
        <li><strong>Payment Declined</strong>: Verify card details, check funds, contact bank</li>
        <li><strong>Payment Not Reflected</strong>: Wait 24-48 hours, check confirmation email</li>
        <li><strong>Invoice Problems</strong>: Verify billing address, request corrected invoice</li>
      </ul>

      <h3>Browser Compatibility</h3>
      <h4>Recommended Browsers:</h4>
      <ul>
        <li>Chrome: Version 90 or newer</li>
        <li>Firefox: Version 88 or newer</li>
        <li>Safari: Version 14 or newer</li>
        <li>Edge: Version 90 or newer</li>
      </ul>

      <h4>Browser Settings:</h4>
      <ul>
        <li>JavaScript: Must be enabled</li>
        <li>Cookies: Must be enabled</li>
        <li>Pop-up Blocker: May need to disable for downloads</li>
      </ul>

      <h3>Getting Help</h3>

      <h4>Support Channels:</h4>
      <ul>
        <li><strong>Email Support</strong>: 24-48 hours response time during business days</li>
        <li><strong>Live Chat</strong>: Monday-Friday, 9 AM - 5 PM (EST)</li>
        <li><strong>Help Center</strong>: 24/7 access to FAQ and tutorials</li>
      </ul>

      <h4>When to Contact Support:</h4>
      <ul>
        <li>Technical issues preventing submission</li>
        <li>Payment problems</li>
        <li>Account access issues</li>
        <li>Manuscript status questions</li>
      </ul>

      <h4>Before Contacting Support:</h4>
      <ol>
        <li>Try basic troubleshooting steps</li>
        <li>Check FAQ section</li>
        <li>Gather relevant information: account email, manuscript ID, error messages</li>
      </ol>

      <h3>Response Times</h3>
      <ul>
        <li><strong>High Priority</strong> (Same day): Payment errors, account access, submission deadlines</li>
        <li><strong>Medium Priority</strong> (24-48 hours): General questions, review inquiries</li>
        <li><strong>Low Priority</strong> (3-5 days): General information, policy clarifications</li>
      </ul>
    `,
    order: 8,
  },
];

async function populateUserManual() {
  try {
    console.log('Connecting to database...');
    await dbConnect();
    
    // Clear existing user manual items
    console.log('Clearing existing user manual items...');
    await UserManual.deleteMany({});
    
    // Insert new user manual sections
    console.log('Inserting new user manual sections...');
    for (const section of manualSections) {
      const userManualItem = new UserManual(section);
      await userManualItem.save();
      console.log(`Created section: ${section.heading}`);
    }
    
    console.log('User manual populated successfully!');
    console.log(`Total sections created: ${manualSections.length}`);
    
  } catch (error) {
    console.error('Error populating user manual:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

// Run the script
populateUserManual();
