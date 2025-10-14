import { db } from "@/lib/db";

async function deletePractice() {
  try {
    // Find user asiegel@curagenesis.com
    const user = await db.user.findUnique({
      where: { email: 'asiegel@curagenesis.com' }
    });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('Found user:', user.id, user.name);
    
    // Find all accounts by this user
    const accounts = await db.account.findMany({
      where: { ownerRepId: user.id },
      include: { contacts: true, submissions: true }
    });
    
    console.log(`Found ${accounts.length} accounts by this user`);
    
    for (const account of accounts) {
      console.log(`\nDeleting account: ${account.practiceName}`);
      console.log(`- Contacts: ${account.contacts.length}`);
      console.log(`- Submissions: ${account.submissions.length}`);
      
      // Delete contacts first
      await db.contact.deleteMany({
        where: { accountId: account.id }
      });
      
      // Delete submissions
      await db.submission.deleteMany({
        where: { accountId: account.id }
      });
      
      // Delete account
      await db.account.delete({
        where: { id: account.id }
      });
      
      console.log(`✅ Deleted account: ${account.practiceName}`);
    }
    
    console.log('\n✅ All practices deleted');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

deletePractice();

