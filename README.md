# takenotesapi
A application for writing notes from anywhere and accessing them from anywhere.

Live at [AWS EC2](http://ec2-13-233-98-246.ap-south-1.compute.amazonaws.com:3000/)

If you clone and use this app, all the http requests will go to aws ec2. You will have to modify all the http requests of my [takenotes repo](https://github.com/rohit21p/takenotes)
from aws to localhost:3000. Then build the [takenotes repo](https://github.com/rohit21p/takenotes) again after modifying the urls and then copy
the build takenotes folder and replace it with current takenotes folder. Run the server again and it will work.
