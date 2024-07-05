# Want to access the Staging DB from local machine.

## pre requirement

- install AWS CLI v2 [read here](https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/getting-started-install.html)
- install Session Manager plugin [read here](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)
- create AWS access key id and secret access key. Ask for the infrastructure manager.

## let's access

[aws documents here](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html#sessions-remote-port-forwarding)

### start port forwarding

```shell
# get bastion instance id 
aws ec2 describe-instances --filter Name=tag:Name,Values=akiverse-staging-bastion Name=instance-state-name,Values=running

#{
#...
#    "Reservations": [
#        {
#            "Groups": [],
#            "Instances": [
#                {
#                    "InstanceId": "i-0d16809453f83b8f1",
# ...

# start SSM session with port forwarding
aws ssm start-session --target INSTANCE_ID \
                      --document-name AWS-StartPortForwardingSessionToRemoteHost \
                      --parameters '{"host":["w.db.akiverse.io.staging.internal"],"portNumber":["5432"], "localPortNumber":["15432"]}'

# success message
# Starting session with SessionId: hoge
# Port 15432 opened for sessionId fuga
# Waiting for connections... 
```

### access from local psql command and/or GUI application,scripts,etc...

```shell
# psql command
psql -h localhost -p 15432

# scripts
DATABASE_URL=postgresql://USERNAME:PASSWORD@localhost:15432/akiverse?schema=public /path/to/command
```

